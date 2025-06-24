import edge_tts, asyncio

async def list_all():
    voice = "ru-RU-AndrewNeural"
    for v in voices:
        print(f'{v["ShortName"]}  —  {v["Locale"]}  —  {v["FriendlyName"]}')

if __name__ == "__main__":
    asyncio.run(list_all())
