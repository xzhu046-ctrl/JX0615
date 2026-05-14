import LegacyFrameApp from '../apps/LegacyFrameApp';
import { useOS } from '../context/OSContext';

export default function PhoneShell() {
  const { activeApp, title, hideTopbar, open, handleBack } = useOS();

  return (
    <>
      <div className="app-topbar" style={{ display: hideTopbar ? 'none' : undefined }}>
        <button className="back-btn" type="button" onClick={handleBack}>
          <span className="back-arrow">‹</span> Back
        </button>
        <span className="app-title-label" id="app-title-label">{title}</span>
        <span style={{ width: 60 }} />
      </div>
      <LegacyFrameApp />
      <span
        hidden
        data-react-phone-shell="true"
        data-active-app={activeApp}
        data-app-open={open ? '1' : '0'}
      />
    </>
  );
}
