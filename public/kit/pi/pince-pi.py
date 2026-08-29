#!/usr/bin/env python3
# PINCE — pont Raspberry Pi 4 (optionnel) vers LilyGO T-Display S3
# python3 -m pip install aiohttp websockets
# python3 pince-pi.py --esp ws://192.168.4.1:81

import argparse, asyncio, websockets
from aiohttp import web

ESP = None
clients = set()

async def pump_esp(url):
    global ESP
    while True:
        try:
            async with websockets.connect(url) as ws:
                ESP = ws
                async for msg in ws:
                    for c in list(clients):
                        await c.send_str(msg)
        except Exception as e:
            print("esp", e)
            ESP = None
            await asyncio.sleep(2)

async def ws_handler(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    clients.add(ws)
    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT and ESP:
                await ESP.send(msg.data)
    finally:
        clients.discard(ws)
    return ws

async def health(_):
    return web.json_response({"ok": True, "esp": ESP is not None})

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--esp", default="ws://192.168.4.1:81")
    p.add_argument("--port", type=int, default=8088)
    args = p.parse_args()
    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/health", health)
    loop = asyncio.get_event_loop()
    loop.create_task(pump_esp(args.esp))
    web.run_app(app, host="0.0.0.0", port=args.port)

if __name__ == "__main__":
    main()
