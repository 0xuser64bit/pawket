import { WalletConnectScreen } from '../src/screens/WalletConnectScreen';
import { usePawketSession } from '../src/state/PawketSessionContext';

export default function WalletScreen() {
  const { connect, error, status } = usePawketSession();
  return <WalletConnectScreen error={error} loading={status !== 'idle'} onConnected={connect} />;
}
