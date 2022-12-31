import { sveltekit } from '@sveltejs/kit/vite';

const myPlugin = () => {
  let server;
  return {
    name: 'configure-server',
    configureServer(_server) {
      server = _server;
    },
    transform(code, id) {
      if (server) {
        console.log(
          `MTTP 0.1\n${JSON.stringify({
            type: 'READY',
            body: {
              port: server.httpServer.address().port,
            },
          })}0.1 MTTP`,
        );
      }
    },
  };
};

/** @type {import('vite').UserConfig} */
const config = {
  server: {
    port: 5173,
  },
  plugins: [sveltekit(), myPlugin()],
};

export default config;
