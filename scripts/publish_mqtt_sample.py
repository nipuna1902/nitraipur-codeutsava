from __future__ import annotations

import argparse
import json
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish one sample Electron smart-meter MQTT reading.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--topic", default="smartmeter/telemetry/C011")
    parser.add_argument("--consumer-id", default=None)
    parser.add_argument("--energy", type=float, default=12.8)
    parser.add_argument("--power", type=float, default=0.74)
    parser.add_argument("--voltage", type=float, default=229.4)
    parser.add_argument("--current", type=float, default=3.2)
    args = parser.parse_args()

    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "voltage": args.voltage,
        "current": args.current,
        "power": args.power,
        "energy": args.energy,
    }
    if args.consumer_id:
        payload["consumer_id"] = args.consumer_id

    client = mqtt.Client(client_id=f"electron_sample_publisher_{int(time.time())}")
    client.connect(args.host, args.port, 60)
    client.publish(args.topic, json.dumps(payload), qos=1)
    client.disconnect()
    print(json.dumps({"topic": args.topic, "payload": payload}, indent=2))


if __name__ == "__main__":
    main()
