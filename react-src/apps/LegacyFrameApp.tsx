import { useOS } from '../context/OSContext';

export default function LegacyFrameApp() {
  const { title } = useOS();
  return <iframe id="app-iframe" title={title} frameBorder={0} allowFullScreen />;
}
