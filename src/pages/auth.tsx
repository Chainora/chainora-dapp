import { useEffect, useMemo, useRef, useState } from 'react';

import { chainoraApiBase } from '../configs/api';
import { useInitiaEVM } from '../providers/InitiaEVMProvider';
import {
  AuthSessionResponse,
  buildAuthQrPayload,
  createAuthSession,
  openAuthLoginSocket,
} from '../services/authQrFlow';
import { buildQrImageUrl } from '../services/qrFlow';

export function AuthPage() {
  const { chainId, address, connect } = useInitiaEVM();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<AuthSessionResponse | null>(null);
  const [jwtToken, setJwtToken] = useState('');
  const [wsStatus, setWsStatus] = useState('idle');
  const [typedData, setTypedData] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);

  const qrPayload = useMemo(() => {
    if (!session) {
      return '';
    }

    return buildAuthQrPayload(chainoraApiBase, session);
  }, [session]);

  const qrImageUrl = useMemo(() => {
    return buildQrImageUrl(qrPayload, 280);
  }, [qrPayload]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await createAuthSession(chainoraApiBase);

      setSession(data);
      setJwtToken('');
    } catch (err) {
      setSession(null);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session?.sessionId) {
      return;
    }

    const ws = openAuthLoginSocket(
      chainoraApiBase,
      session.sessionId,
      payload => {
        if (payload.token) {
          setJwtToken(payload.token);
          setWsStatus('verified');
        }
      },
      state => {
        setWsStatus(current => (state === 'closed' && current === 'verified' ? current : state));
      },
    );
    wsRef.current = ws;

    return () => {
      ws.close();
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
  }, [session?.sessionId]);

  const handleBuildTypedData = async () => {
    setError('');
    setTypedData('');

    try {
      if (!address) {
        await connect();
      }
      const wallet = address;
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      const response = await fetch(`${chainoraApiBase}/v1/tx/typed-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chainId: String(chainId),
          verifyingContract: '0x0000000000000000000000000000000000000000',
          from: wallet,
          to: wallet,
          amount: '1',
          nonce: session?.nonce ?? 'demo-nonce',
        }),
      });

      if (!response.ok) {
        throw new Error(`Build typed-data failed: ${response.status}`);
      }

      const data = await response.json();
      setTypedData(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <section>
      <h1>QR Login</h1>
      <p>Press login to create a QR session.</p>

      <button type="button" onClick={handleLogin} disabled={loading}>
        {loading ? 'Loading...' : 'Login'}
      </button>

      {error ? <p>{error}</p> : null}

      {session ? (
        <div>
          <p>sessionId: {session.sessionId}</p>
          <p>nonce: {session.nonce}</p>
          <p>ws: {wsStatus}</p>
          {qrImageUrl ? <img src={qrImageUrl} alt="Login QR" /> : null}
          {jwtToken ? <p>jwt: {jwtToken}</p> : null}
        </div>
      ) : null}

      <hr />

      <h2>EIP-712 Transaction</h2>
      <button type="button" onClick={() => void handleBuildTypedData()}>
        Build Transfer Typed Data
      </button>
      {typedData ? <pre>{typedData}</pre> : null}
    </section>
  );
}
