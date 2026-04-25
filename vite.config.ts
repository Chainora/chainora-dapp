import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rpcTarget = env.VITE_CHAINORA_RPC_PROXY_TARGET?.trim() || 'http://157.66.100.120:8545';

  return {
    plugins: [
      TanStackRouterVite({
        target: 'react',
        autoCodeSplitting: true,
        routesDirectory: './src/routes',
        generatedRouteTree: './src/routeTree.gen.ts',
      }),
      react(),
    ],
    server: {
      host: true,
      proxy: {
        '/rpc/chainora': {
          target: rpcTarget,
          changeOrigin: true,
          secure: false,
          rewrite: path => path.replace(/^\/rpc\/chainora\/?/, '/'),
        },
      },
    },
  };
});
