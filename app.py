from werkzeug.utils import secure_filename
import os, json, time, uuid, asyncio
from datetime import datetime, timedelta
from collections import defaultdict
from flask import Flask, redirect, url_for, session, request, jsonify, render_template, send_file
from flask_login import LoginManager, login_user, logout_user, login_required, UserMixin, current_user
from flask_dance.contrib.google import make_google_blueprint, google
import edge_tts

# 🔧 Конфигурация
app = Flask(__name__, static_folder="static")
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "supersecretkey")

# 📁 Пути и лимиты
OUTPUT_DIR = "static"
HISTORY_FILE = "history.json"
COUNT_FILE = "generate_count.json"
UPLOADS_DIR = "static/uploads"
PAYMENTS_FILE = "payments.json"
MAX_HISTORY = 10
MAX_CHARS = 5000
DAILY_LIMIT = 10

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(UPLOADS_DIR, exist_ok=True)
if not os.path.exists(PAYMENTS_FILE):
    with open(PAYMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump([], f)

# 🔐 Google OAuth
os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'
google_bp = make_google_blueprint(
    client_id="1064380848188-...",
    client_secret="GOCSPX-...",
    redirect_url="https://prizrakai.onrender.com/login/google/authorized",
    scope=["openid", "https://www.googleapis.com/auth/userinfo.profile", "https://www.googleapis.com/auth/userinfo.email"],
    redirect_to="google_login"
)

app.register_blueprint(google_bp, url_prefix="/login")

# 🔐 Flask-Login
login_manager = LoginManager()
login_manager.login_view = "google.login"
login_manager.init_app(app)

class User(UserMixin):
    def __init__(self, id_, name, email, picture=None):
        self.id = id_
        self.name = name
        self.email = email
        self.picture = picture

users = {}

@login_manager.user_loader
def load_user(user_id):
    return users.get(user_id)

@app.route("/google_login")
def google_login():
    if not google.authorized:
        return redirect(url_for("google.login"))

    try:
        resp = google.get("https://www.googleapis.com/oauth2/v1/userinfo")
        info = resp.json()
    except Exception as e:
        return f"Ошибка авторизации: {e}", 500

    if "id" not in info:
        return "Ошибка: нет ID от Google", 500

    # ✅ путь к аватарке по умолчанию
    default_picture = url_for('static', filename='icons/ava.png')


    # ✅ если у Google есть фото — берём его, иначе стандартное
    picture = info.get("picture") or default_picture

    user = User(info["id"], info["name"], info["email"], picture=picture)
    users[user.id] = user
    login_user(user)

    return redirect(url_for("dashboard"))


@app.route("/submit_payment", methods=["POST"])
@login_required
def submit_payment():
    name = request.form.get("name")
    file = request.files.get("screenshot")

    if not name or not file:
        return jsonify({"success": False, "message": "Неверные данные"})

    filename = datetime.now().strftime(f"%Y%m%d-%H%M%S_{secure_filename(file.filename)}")
    filepath = os.path.join(UPLOADS_DIR, filename)
    file.save(filepath)

    with open(PAYMENTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    data.append({
        "user_id": current_user.id,
        "name": name,
        "filename": filename,
        "status": "pending",
        "date": datetime.now().isoformat()
    })

    with open(PAYMENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({"success": True})

@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("index"))

# 📣 Загрузка голосов
ALL_VOICES = asyncio.run(edge_tts.list_voices())
SUPPORTED_VOICES = []
RUSSIAN_VOICE_MAP = {
    "Dmitry": "Парвиз", "Svetlana": "Марина", "Dariya": "Дарья", "Natasha": "Наташа",
    "Yuri": "Юрий", "Ivan": "Иван", "Olga": "Ольга", "Alena": "Алена",
    "Kseniya": "Ксения", "Ilya": "Илья", "Ekaterina": "Екатерина"
}
for v in ALL_VOICES:
    short = v.get("ShortName", "")
    locale = v.get("Locale", "")
    base = short.split("-")[-1].replace("Neural", "")
    if locale.startswith("ru"):
        v["FriendlyName"] = RUSSIAN_VOICE_MAP.get(base, f"Голос: {base}")
        v["LangGroup"] = "ru"
        SUPPORTED_VOICES.append(v)
    elif locale.startswith("en"):
        v["FriendlyName"] = base
        v["LangGroup"] = "en"
        SUPPORTED_VOICES.append(v)

# ⚙️ Утилиты
last_generate_time = defaultdict(lambda: 0)
ip_usage = defaultdict(lambda: {"count": 0, "day": time.strftime("%Y-%m-%d"), "first_time": datetime.now().isoformat()})

def load_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                return [x for x in json.load(f) if os.path.exists(os.path.join(OUTPUT_DIR, x["filename"]))]
        except: return []
    return []

def load_count():
    try:
        with open(COUNT_FILE, 'r', encoding='utf-8') as f:
            return json.load(f).get("count", 0)
    except: return 0

def save_count(count):
    with open(COUNT_FILE, 'w', encoding='utf-8') as f:
        json.dump({"count": count}, f)

def cleanup_history():
    if not os.path.exists(HISTORY_FILE): return
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if len(data) > MAX_HISTORY:
            for item in data[MAX_HISTORY:]:
                path = os.path.join(OUTPUT_DIR, item["filename"])
                if os.path.exists(path): os.remove(path)
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            json.dump(data[:MAX_HISTORY], f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[cleanup_history] Ошибка: {e}")

async def synthesize(text, voice, out_path):
    communicator = edge_tts.Communicate(text=text, voice=voice)
    await communicator.save(out_path)

# 🔊 Главная
@app.route("/", methods=["GET", "POST"])
@login_required
def index():
    history = load_history()
    total_count = load_count()
    last_text = ""
    last_voice = ""
    user_ip = request.remote_addr
    now = time.time()
    today = time.strftime("%Y-%m-%d")

    if ip_usage[user_ip]["day"] != today:
        ip_usage[user_ip] = {"count": 0, "day": today, "first_time": datetime.now().isoformat()}

    if request.method == "POST":
        if now - last_generate_time[user_ip] < 5:
            return jsonify({"error": "Подождите 5 секунд перед следующей генерацией."}), 429
        if ip_usage[user_ip]["count"] >= DAILY_LIMIT:
            block_until = datetime.fromisoformat(ip_usage[user_ip]["first_time"]) + timedelta(days=1)
            remaining = block_until - datetime.now()
            h, rem = divmod(remaining.seconds, 3600)
            m = rem // 60
            return render_template("index.html", voices=SUPPORTED_VOICES, history=history,
                last_text=last_text, last_voice=last_voice, total_count=total_count,
                remaining_generations=0, limit_error=f"Вы исчерпали лимит. Следующая генерация через {h}ч {m}м.")

        text = request.form.get("text", "").strip()
        voice = request.form.get("voice", "").strip()
        last_text = text
        last_voice = voice

        if not text or not voice:
            return render_template("error.html", message="Введите текст и выберите голос"), 400
        if len(text) > MAX_CHARS:
            return f"<h2 style='color:red'>Слишком длинный текст</h2>", 400

        filename = f"{uuid.uuid4().hex}.mp3"
        path = os.path.join(OUTPUT_DIR, filename)
        try:
            asyncio.run(synthesize(text, voice, path))
        except Exception as e:
            return f"<h2 style='color:red'>Ошибка синтеза: {e}</h2>", 500

        friendly = next((v["FriendlyName"] for v in SUPPORTED_VOICES if v["ShortName"] == voice), voice)
        history.insert(0, {"filename": filename, "voice": friendly, "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")})
        history = history[:MAX_HISTORY]
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)

        cleanup_history()
        total_count += 1
        save_count(total_count)
        last_generate_time[user_ip] = now
        ip_usage[user_ip]["count"] += 1

        return redirect(url_for("index"))

    remaining = max(0, DAILY_LIMIT - ip_usage[user_ip]["count"])
    return render_template("index.html", voices=SUPPORTED_VOICES, history=history,
        last_text=last_text, last_voice=last_voice, total_count=total_count,
        remaining_generations=remaining)

# 🔽 Скачивание
@app.route("/download/<path:filename>")
def download_file(filename):
    history = load_history()
    item = next((x for x in history if x["filename"] == filename), None)
    if not item: return "Файл не найден", 404
    path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(path): return "Файл не существует", 404
    name = f"PRIZRAK_{item['voice']}_{item['timestamp'].replace(':', '-').replace(' ', '_')}.mp3"
    return send_file(path, as_attachment=True, download_name=name)

# 🧹 Очистка истории
@app.route("/clear", methods=["POST"])
def clear_history():
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
                for item in json.load(f):
                    path = os.path.join(OUTPUT_DIR, item['filename'])
                    if os.path.exists(path): os.remove(path)
        except: pass
    with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f, ensure_ascii=False, indent=2)
    return redirect(url_for("index"))

#  Личный кабинет
@app.route("/dashboard")
@login_required
def dashboard():
    user = current_user

    user_data = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "picture": user.picture or url_for('static', filename='uploads/default_avatar.png'),
        "registered_at": "2024-01-01",  # если хочешь — вставим из БД позже
        "tariff_name": "Free",
        "daily_limit": 10,
        "tariff_expires": "бессрочно",
        "days_left": "∞"
    }

    payments = []
    try:
        with open(PAYMENTS_FILE, "r", encoding="utf-8") as f:
            all_data = json.load(f)
            payments = [p for p in all_data if p.get("email") == user.email]
    except Exception as e:
        print(f"[dashboard] Ошибка чтения платежей: {e}")

    return render_template("dashboard.html", user=user_data, payments=payments)

# 📦 Кеш статики
@app.after_request
def add_cache_headers(response):
    if request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=31536000"
    return response

if __name__ == "__main__":
    import logging
    import os
    from waitress import serve

    logging.basicConfig(level=logging.DEBUG)

    print("\n📢 Русские голоса:")
    for v in SUPPORTED_VOICES:
        if v["LangGroup"] == "ru":
            print(f"- {v['ShortName']} — {v['FriendlyName']}")

    port = int(os.environ.get("PORT", 5000))
    serve(app, host="0.0.0.0", port=port)

