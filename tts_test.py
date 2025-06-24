import argparse
import asyncio
import edge_tts
from pathlib import Path

async def synthesize(text: str, voice: str, output: str):
    communicate = edge_tts.Communicate(text, voice=voice)
    await communicate.save(output)

def main():
    parser = argparse.ArgumentParser(
        description="Утилита TTS на edge-tts (по умолчанию ru-RU-DmitryNeural)"
    )
    parser.add_argument(
        "-i", "--input",
        help="Текст для озвучки или путь к .txt‑файлу (с флагом --file)"
    )
    parser.add_argument(
        "-o", "--output",
        default="output.mp3",
        help="Имя выходного MP3‑файла"
    )
    parser.add_argument(
        "--file",
        action="store_true",
        help="Читать текст из файла (--input — путь к файлу)"
    )
    parser.add_argument(
        "--interactive",
        action="store_true",
        help="Ввести текст вручную после запуска"
    )
    parser.add_argument(
        "-v", "--voice",
        default="ru-RU-DmitryNeural",
        help="Имя голоса"
    )
    args = parser.parse_args()

    # Определяем текст
    if args.interactive:
        text = input("Введите текст для озвучки: ")
    elif args.file:
        path = Path(args.input or "")
        if not path.is_file():
            print(f"Ошибка: файл не найден — {args.input}")
            return
        text = path.read_text(encoding="utf-8")
    elif args.input:
        text = args.input
    else:
        print("Ошибка: не указан текст (--input) и не включён режим интерактивного ввода (--interactive).")
        return

    # Запускаем синтез
    asyncio.run(synthesize(text, args.voice, args.output))
    print(f"Аудиофайл создан: {args.output}")

if __name__ == "__main__":
    main()
