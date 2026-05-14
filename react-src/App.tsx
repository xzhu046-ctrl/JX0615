import PhoneShell from './components/PhoneShell';
import { OSProvider } from './context/OSContext';
import type { ShellAppHostSnapshot } from './types';

export default function App({ snapshot }: { snapshot: ShellAppHostSnapshot }) {
  return (
    <OSProvider snapshot={snapshot}>
      <PhoneShell />
    </OSProvider>
  );
}
