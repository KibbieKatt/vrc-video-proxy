# Streaming Proxy Server

A Node.js application to proxy and rewrite `.m3u8` streaming URLs with **caching**, **origin lock**, **rate limiting**, **logging**, and **Docker support**.

## Features

- **Caching**: Responses are cached in memory to reduce repeated requests to the origin server.
- **Origin Lock**: Restrict access to the proxy by allowing requests only from specific origins.
- **Rate Limiting**: Prevent abuse by limiting the number of requests from a single IP.
- **Logging**: Log HTTP requests for monitoring and debugging.
- **Security Headers**: Protect against common web vulnerabilities.
- **Docker Support**: Easily deploy the application using Docker.
- **Health Check**: Monitor the application's status.

## Getting started

1. Run the container

    ```yml
    services:
      vvp:
        image: vrc-video-proxy
        build:
          context: vrc-video-proxy
          dockerfile: Dockerfile
        container_name: vvp
        restart: unless-stopped
        labels:
          - "traefik.enable=true"
          - "traefik.http.routers.vvp.rule=Host(`yourdomain.com`)"
          - "traefik.http.services.vvp.loadbalancer.server.port=3000"
          - "traefik.http.routers.vvp.entrypoints=websecure"
          - "traefik.http.routers.vvp.tls.certresolver=mytlschallenge"
        networks:
          - default
          - ingress

    networks:
      ingress:
        external: true
    ```

2. Load a youtube video into a VRC video player using the proxy:

    `https://your.domain.com/watch?v=xxxxxxxxxxx`

3. Or load any m3u8 url using the proxy:

    `https://yourdomain.com/api/v1/streamingProxy?url=<urlencoded-url>`

## Other examples

Get a playlist URL from yt-dlp manually and urlencode it

`yt-dlp -gS proto:m3u8 "youtube-url" | jq -sRr @uri`

## One-Click Deployment

### **Deploy to Render**

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/KibbieKatt/vrc-video-proxy)

### **Deploy to Vercel**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KibbieKatt/vrc-video-proxy)

## Manual Deployment

### **Prerequisites**

- Node.js (v16 or higher)
- npm (Node Package Manager)

### **Steps**

1. **Clone the Repository**

   ```bash
   git clone https://github.com/MetaHat/m3u8-streaming-proxy.git
   cd m3u8-streaming-proxy
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Set Up Environment Variables**
   - Create a `.env` file in the root directory:

     ```env
     PORT=3000
     ```

4. **Start the Server**
   - For development (with auto-restart):

     ```bash
     npm run dev
     ```

   - For production:

     ```bash
     npm start
     ```

5. **Access the Application**
   - Open your browser and navigate to:

     ```text
     http://localhost:3000
     ```

---

## **Usage**

### **1. Proxy Endpoint**

- Make a GET request to the proxy endpoint with the `url` query parameter:

  ```text
  http://localhost:3000/api/v1/streamingProxy?url=<your-m3u8-url>
  ```

- Example:

  ```text
  http://localhost:3000/api/v1/streamingProxy?url=https://example.com/stream/playlist.m3u8
  ```

### **2. Test with the HTML Page**

- Open the HTML page at `http://localhost:3000`.
- Enter a `.m3u8` URL in the input field and click "Load Stream".
- The video will load and play in the video player.

---

## Configuration

- **Caching**: Adjust the cache TTL in `src/server.js`.
- **Origin Lock**: Update the `allowedOrigins` array in `src/server.js`.

---

## **API Reference**

### **GET `/api/v1/streamingProxy`**

- **Description**: Proxies and rewrites `.m3u8` playlists and `.ts` segments.
- **Query Parameters**:
  - `url`: The URL of the `.m3u8` playlist or `.ts` segment.
- **Response**:
  - For `.m3u8` playlists: Rewritten playlist with proxy URLs.
  - For `.ts` segments: The segment file.

---

## **Examples**

### **Example `.m3u8` URLs for Testing**

- **Big Buck Bunny**:

  ```text
  https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8
  ```

- **Apple Sample**:

  ```text
  https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8
  ```

---

## **Contributing**

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes.
4. Submit a pull request.

---

## **License**

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## **Acknowledgements**

- Made by [Metahat](https://github.com/metahat).
- Built with ❤️ and open-source tools.

---

## **Support**

If you encounter any issues or have questions, please open an issue on [GitHub](https://github.com/metahat/m3u8-streaming-proxy-/issues).
