import React from "react";
import Header from "../components/Header";
import { Cpu, Zap, Wifi } from "lucide-react";

const ARDUINO_CODE = `// ============================================================
//  AgriFlow WashOps - ESP32 Firmware Example
//  Sensors: pH (analog), Turbidity (analog), ESP32-CAM (HTTP)
//  Actuators: DC Motor (PWM via L298N), Solenoid Nozzle, Servo
// ============================================================
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP32Servo.h>

// ---- WiFi ----
// ⚠️ REPLACE THESE PLACEHOLDERS BEFORE FLASHING TO HARDWARE
// ============================================================
const char* ssid     = "YOUR_WIFI_SSID";          // ← ganti
const char* password = "YOUR_WIFI_PASSWORD";       // ← ganti

// ---- Backend ----
const char* SERVER_URL = "https://YOUR_DOMAIN/api";    // ← ganti dengan URL console Anda
const char* JWT_TOKEN  = "PASTE_YOUR_LOGIN_TOKEN_HERE"; // ← copy dari localStorage 'agriflow_token' setelah login

// ---- Pins ----
#define PH_PIN        34   // analog
#define TURBIDITY_PIN 35   // analog
#define MOTOR_EN      25   // PWM out to L298N ENA
#define MOTOR_IN1     26
#define MOTOR_IN2     27
#define NOZZLE_PIN    14   // solenoid relay
#define SERVO_PIN     13

Servo pushServo;

void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  pinMode(NOZZLE_PIN, OUTPUT);
  ledcSetup(0, 5000, 8);
  ledcAttachPin(MOTOR_EN, 0);
  pushServo.attach(SERVO_PIN);
  pushServo.write(0);

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\\nConnected: " + WiFi.localIP().toString());
}

float readPH() {
  // Calibration depends on probe. Example linear map.
  int raw = analogRead(PH_PIN);             // 0..4095
  float v = raw * (3.3 / 4095.0);
  float ph = 7.0 + ((2.5 - v) / 0.18);       // adjust slope per sensor
  return ph;
}

float readTurbidity() {
  // SEN0189 turbidity sensor (NTU approximation)
  int raw = analogRead(TURBIDITY_PIN);
  float v = raw * (3.3 / 4095.0);
  float ntu = -1120.4 * v * v + 5742.3 * v - 4352.9;
  if (ntu < 0) ntu = 0;
  return ntu;
}

void setMotor(int speedPct) {
  if (speedPct <= 0) {
    digitalWrite(MOTOR_IN1, LOW);
    digitalWrite(MOTOR_IN2, LOW);
    ledcWrite(0, 0);
  } else {
    digitalWrite(MOTOR_IN1, HIGH);
    digitalWrite(MOTOR_IN2, LOW);
    ledcWrite(0, map(speedPct, 0, 100, 0, 255));
  }
}

void setNozzle(bool on) { digitalWrite(NOZZLE_PIN, on ? HIGH : LOW); }
void pushVeg() {
  pushServo.write(120); delay(800);
  pushServo.write(0);
}

void postSensors(float ph, float ntu, int motor, bool nozzle, int servoPos) {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/sensors/ingest");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + JWT_TOKEN);

  StaticJsonDocument<256> doc;
  doc["ph"] = ph;
  doc["turbidity"] = ntu;
  doc["motor_speed"] = motor;
  doc["nozzle_on"] = nozzle;
  doc["servo_position"] = servoPos;
  String body; serializeJson(doc, body);

  int code = http.POST(body);
  Serial.printf("POST /sensors/ingest -> %d\\n", code);
  http.end();
}

void fetchControl(int &motor, bool &nozzle, bool &servoPush) {
  HTTPClient http;
  http.begin(String(SERVER_URL) + "/control");
  http.addHeader("Authorization", String("Bearer ") + JWT_TOKEN);
  int code = http.GET();
  if (code == 200) {
    StaticJsonDocument<512> doc;
    deserializeJson(doc, http.getString());
    motor = doc["motor_speed"] | 0;
    nozzle = doc["nozzle_on"] | false;
    servoPush = doc["servo_push"] | false;
  }
  http.end();
}

unsigned long lastTick = 0;
void loop() {
  unsigned long now = millis();
  if (now - lastTick > 3000) {
    lastTick = now;

    int motor = 0; bool nozzle = false; bool servoPush = false;
    fetchControl(motor, nozzle, servoPush);
    setMotor(motor);
    setNozzle(nozzle);
    if (servoPush) pushVeg();

    float ph = readPH();
    float ntu = readTurbidity();
    postSensors(ph, ntu, motor, nozzle, servoPush ? 120 : 0);

    Serial.printf("pH=%.2f NTU=%.1f motor=%d%% nozzle=%d\\n",
                  ph, ntu, motor, nozzle);
  }
}`;

const PYTHON_SIMULATOR = `#!/usr/bin/env python3
"""Simulator alternatif (jika tidak punya ESP32 fisik)"""
import requests, time, random

API = "https://YOUR_DOMAIN/api"
TOKEN = "PASTE_YOUR_LOGIN_TOKEN"
H = {"Authorization": f"Bearer {TOKEN}"}

while True:
    ctrl = requests.get(f"{API}/control", headers=H).json()
    motor = ctrl.get("motor_speed", 0)
    nozzle = ctrl.get("nozzle_on", False)
    ph = round(7.2 + random.uniform(-0.5, 0.5), 2)
    ntu = round(5 + (motor / 100) * 80 + random.uniform(-5, 10), 1)
    requests.post(f"{API}/sensors/ingest", headers=H, json={
        "ph": ph, "turbidity": ntu,
        "motor_speed": motor, "nozzle_on": nozzle,
    })
    print(f"pH={ph} NTU={ntu} motor={motor}%")
    time.sleep(3)`;

export default function ArduinoCode() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <div className="overline mb-1.5">// firmware</div>
          <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight">ESP32 Code</h1>
          <p className="text-neutral-500 text-sm mt-1">Salin firmware untuk menghubungkan hardware fisik Anda ke console.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card-flat p-4">
            <Cpu className="text-cyan-400 mb-3" />
            <div className="font-display font-bold mb-1">Hardware</div>
            <div className="text-xs text-neutral-500 leading-relaxed">
              ESP32 + ESP32-CAM, sensor pH, SEN0189 turbidity, L298N + DC motor, solenoid valve nozzle, servo SG90.
            </div>
          </div>
          <div className="card-flat p-4">
            <Wifi className="text-cyan-400 mb-3" />
            <div className="font-display font-bold mb-1">Protokol</div>
            <div className="text-xs text-neutral-500 leading-relaxed">
              ESP32 polling <span className="font-mono text-cyan-400">/api/control</span> setiap 3 detik & POST telemetry ke <span className="font-mono text-cyan-400">/api/sensors/ingest</span>.
            </div>
          </div>
          <div className="card-flat p-4">
            <Zap className="text-cyan-400 mb-3" />
            <div className="font-display font-bold mb-1">Auth</div>
            <div className="text-xs text-neutral-500 leading-relaxed">
              Login di console → buka DevTools → Local Storage → copy <span className="font-mono text-cyan-400">agriflow_token</span> → paste ke firmware.
            </div>
          </div>
        </div>

        <div className="card-flat p-0 overflow-hidden" data-testid="arduino-code-block">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#262626] bg-[#0E0E0E]">
            <span className="font-mono text-xs text-cyan-400">esp32_firmware.ino</span>
            <button
              data-testid="copy-arduino-btn"
              onClick={() => { navigator.clipboard.writeText(ARDUINO_CODE); }}
              className="text-[11px] uppercase tracking-widest text-neutral-500 hover:text-cyan-400">
              Copy
            </button>
          </div>
          <pre className="p-5 text-xs font-mono leading-relaxed overflow-x-auto text-neutral-300 max-h-[500px]">
{ARDUINO_CODE}
          </pre>
        </div>

        <div className="card-flat p-0 overflow-hidden" data-testid="python-sim-block">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#262626] bg-[#0E0E0E]">
            <span className="font-mono text-xs text-cyan-400">simulator.py · alternatif tanpa hardware</span>
            <button
              data-testid="copy-python-btn"
              onClick={() => { navigator.clipboard.writeText(PYTHON_SIMULATOR); }}
              className="text-[11px] uppercase tracking-widest text-neutral-500 hover:text-cyan-400">
              Copy
            </button>
          </div>
          <pre className="p-5 text-xs font-mono leading-relaxed overflow-x-auto text-neutral-300">
{PYTHON_SIMULATOR}
          </pre>
        </div>
      </main>
    </div>
  );
}
