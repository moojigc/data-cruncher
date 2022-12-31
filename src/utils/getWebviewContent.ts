export default async function getWebviewContent(src: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Cruncher</title>
</head>
<body style="height: 100vh">
  <pre id="message"></pre>
  <iframe id="iframe" src="${src}" width="100%" height="80%" frameborder="0" allowfullscreen></iframe>
  <script>
    const iframe = document.getElementById('iframe');
    const messageDiv = document.getElementById('message');
    window.addEventListener('message', event => {
      const message = event.data;
      messageDiv.innerText = JSON.stringify(message, null, 2);
      iframe.contentWindow.postMessage(event.data, '*');
    })
  </script>
</body>
</html>`;
}
