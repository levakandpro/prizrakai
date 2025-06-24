from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
from datetime import datetime

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

DATA_FILE = 'data.txt'  # Простое хранение заявок

@app.route('/submit_payment', methods=['POST'])
def submit_payment():
    name = request.form.get('name')
    file = request.files.get('screenshot')

    if not name or not file:
        return jsonify({'success': False, 'message': 'Неверные данные'})

    filename = datetime.now().strftime(f"%Y%m%d-%H%M%S_{secure_filename(file.filename)}")
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    with open(DATA_FILE, 'a', encoding='utf-8') as f:
        f.write(f"{datetime.now().isoformat()}|{name}|{filename}|pending\n")

    return jsonify({'success': True})

@app.route('/get_requests')
def get_requests():
    data = []
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            for line in f:
                date, name, filename, status = line.strip().split('|')
                data.append({'date': date, 'name': name, 'filename': filename, 'status': status})
    return jsonify(data)

if __name__ == '__main__':
    app.run(debug=True)
