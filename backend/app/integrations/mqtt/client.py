import json
import logging
import paho.mqtt.client as mqtt

logger = logging.getLogger("mqtt_client")

class MQTTClientManager:
    def __init__(self, broker_host: str = "localhost", broker_port: int = 1883):
        self.broker_host = broker_host
        self.broker_port = broker_port
        self.client = mqtt.Client(client_id="backend_consumer")
        self.ws_broadcast_callback = None

    def set_broadcast_callback(self, callback):
        self.ws_broadcast_callback = callback

    def on_connect(self, client, userdata, flags, rc):
        logger.info(f"Connected to MQTT broker with result code {rc}")
        client.subscribe("smartmeter/telemetry/#")

    def on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode("utf-8"))
            logger.debug(f"MQTT Message received on {msg.topic}: {payload}")
            if self.ws_broadcast_callback:
                self.ws_broadcast_callback(payload)
        except Exception as e:
            logger.error(f"Error processing MQTT message: {e}")

    def start(self):
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.connect_async(self.broker_host, self.broker_port, 60)
        self.client.loop_start()

    def stop(self):
        self.client.loop_stop()
        self.client.disconnect()

mqtt_manager = MQTTClientManager()