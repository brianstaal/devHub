# DevHub: Developer Landing Page & Link Mapper

DevHub is a lightweight, responsive developer landing page designed to organize and map internal software tools (like Grafana, Jira, GitHub, Azure DevOps, etc.) in a company. 

It provides an intuitive grid interface where links can be customized, filtered, and sorted dynamically using drag-and-drop. It also features automatic page metadata scraping to retrieve titles, descriptions, and favicons from URLs instantly.

---

## 🎨 Color Scheme & Design System
The visual style is curated for a modern, sleek developer feel using an **Obsidian Glassmorphism** aesthetic:
- **Background Base**: `#07090e` (Obsidian black with floating mesh gradient blobs).
- **Core Brand Accents**: A beautiful Purple-to-Blue gradient (`#8b5cf6` to `#3b82f6`) for buttons, search active glows, and floating elements.
- **Dynamic Colorful Card Themes**: Each card is assigned a unique, vibrant gradient (e.g., Indigo-Violet, Emerald-Teal, Orange-Red, Rose-Pink) based on its title. The card borders, fallback icons, and hover shadows glow in these unique colors dynamically.
- **Card Background**: A semi-transparent slate (`rgba(15, 23, 42, 0.45)`) with a `backdrop-filter: blur(14px) saturate(110%)`.
- **Typography**: Clean hierarchy utilizing the `Outfit` font for headers and `Inter` for content.

---

## 🛠️ Tech Stack & Architecture

### Backend (`www/server.js`)
- **Runtime**: Node.js
- **Server**: Express
- **Parser**: `node-html-parser` (fast, lightweight HTML parser for metadata scraping)
- **API Endpoints**:
  - `GET /api/links` — Reads active link configurations from storage.
  - `POST /api/links` — Persists customized link lists to storage.
  - `GET /api/metadata?url=...` — Safely fetches external HTML pages, extracts details (`<title>`, `<meta name="description">`, icons), and handles path resolution for relative favicons.

### Frontend (`www/public/`)
- Pure, native HTML5, Vanilla CSS, and modern JavaScript.
- Built-in drag-and-drop sorting using HTML5 Drag and Drop APIs.
- Filter search bar with hotkey activation (press `/` key to search).
- Modals for adding/editing tools featuring a **Live Card Preview** that updates in real-time.
- Automatic text-fallback icon generation if favicons fail to load or are missing.

### Datastore & Persistence
- Links are stored on the server as a JSON database inside the `./data/links.json` file.
- The browser's `localStorage` is used as a transparent failover layer if the backend goes offline.

---

## 🚀 Running the Project

### Prerequisites
- **Node.js**: v20 or newer (tested on v26)
- **Docker**: (Optional) For containerized deployments.

### Local Installation & Start
1. Navigate to the server folder:
   ```bash
   cd www
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Run the development server (runs in watch mode using native Node.js hot-reloading):
   ```bash
   npm run dev
   ```
4. Start in standard production mode:
   ```bash
   npm start
   ```
5. Open your browser and navigate to `http://localhost:2999`.

---

## 🐳 Docker Deployment & Datastore Mapping

DevHub includes a container configuration (`www/Dockerfile`) that enables quick deployment. It exposes port `2999` and defines `/app/data` as a mountable directory holding the persistent links database (`links.json`).

### 1. The Dockerfile
The application uses the following `Dockerfile` inside the `www/` directory:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY server.js ./
COPY public/ ./public/
EXPOSE 2999
RUN mkdir -p /app/data
VOLUME /app/data
CMD ["npm", "start"]
```

### 2. Build the Docker Image
Transfer the files to your machine and run the build command from the project root:
```bash
docker build -t devhub-landing-page ./www
```

### 3. Deploying on Ubuntu Server 26.04 (Production)
For a persistent production deployment on **Ubuntu Server 26.04**, follow these steps:

#### A. Set up Host Directory & Permissions
Create a dedicated storage directory on the host:
```bash
sudo mkdir -p /var/lib/devhub/data
# Ensure docker has permission to write to this directory
sudo chmod -R 777 /var/lib/devhub/data
```

#### B. Start the Container
Run the container with restart policies so it launches automatically on system boot:
```bash
docker run -d \
  -p 2999:2999 \
  -v /var/lib/devhub/data:/app/data \
  --name devhub \
  --restart unless-stopped \
  devhub-landing-page
```

---

### 4. Alternative Run Environments

#### On Linux / macOS Development:
```bash
docker run -d \
  -p 2999:2999 \
  -v $(pwd)/data:/app/data \
  --name devhub \
  devhub-landing-page
```

#### On Windows Development (Command Prompt):
```cmd
docker run -d ^
  -p 2999:2999 ^
  -v %cd%\data:/app/data ^
  --name devhub ^
  devhub-landing-page
```

---

### Explanation of Docker Flags:
- `-d`: Runs the container in the background (detached mode).
- `-p 2999:2999`: Maps port `2999` of the host to port `2999` of the container.
- `-v /var/lib/devhub/data:/app/data`: Binds the container's storage folder (`/app/data`) to the Ubuntu Server's host path (`/var/lib/devhub/data`). Any tool links added, edited, or reordered will persist here across container rebuilds.
- `--restart unless-stopped`: Ensures the DevHub service starts up automatically after server updates or host reboots.
- `--name devhub`: Assigns a readable identifier to the container.

---

## 💡 How to Use

### Adding a Link
1. Click the floating blue `+` button in the bottom-right corner.
2. Type or paste the destination URL (e.g., `https://grafana.company.local`).
3. Press **Tab** or click **Fetch Info**. The backend will scrape the page titles, descriptions, and icon images, pre-filling the inputs.
4. Customize the fetched data in the inputs if necessary (changes are visible live in the mockup preview card).
5. Click **Save Tool**.

### Reordering / Sorting
- Hover over any card on the grid. A drag handle (vertical grip icon) will appear on the left.
- Click and drag the card, then drop it into its new position. The list will auto-save and update instantly on the server.

### Editing or Deleting
- Hover over any card. Two icons (pencil and trash) will appear in the top-right corner.
- Click the **Pencil Icon** to open the Edit Modal with current properties pre-populated.
- Click the **Trash Icon** to delete the tool. Confirm the prompt to remove the entry.
