# WebSocket Chat App
### Echtzeit-Chat-Anwendung

![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.x-6db33f?style=flat&logo=springboot)
![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-blue?style=flat)
![Java](https://img.shields.io/badge/Java-17+-orange?style=flat&logo=openjdk)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)

> Real-time group chat built with Spring Boot, WebSocket, STOMP and SockJS.
> Echtzeit-Gruppen-Chat mit Spring Boot, WebSocket, STOMP und SockJS.

---

## Features / Funktionen

- Real-time messaging without page reload
- Join and leave notifications for all users
- Color-coded avatar per user
- Works in multiple browser tabs simultaneously
- No registration required
- Responsive design (mobile + desktop)

---

## Tech Stack / Technologie-Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3, Spring WebSocket |
| Protocol | STOMP over WebSocket |
| Fallback | SockJS |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Build | Maven |
| Runtime | Java 17+ |

---

## Getting Started / Installation

```bash
git clone https://github.com/yassinefathallah/websocket-chat-app.git
cd websocket-chat-app
mvn spring-boot:run
```

Open your browser at: **http://localhost:8080**

---

## How to Use / Benutzung

1. Open http://localhost:8080
2. Enter any username and click **Start Chatting**
3. Type a message and press **Send** or **Enter**
4. Open a second tab to simulate a second user

---

## Documentation

Full code documentation for beginners (EN/DE) is available in the `docs/` folder.

---

## Author / Autor

**Yassine Fathallah**
GitHub: [yassinefathallah](https://github.com/yassinefathallah)

---

## License
MIT License — 2025
