// Stitches the 5 screens onto a DesignCanvas.
// Each artboard is a browser-framed device at 1440×900 — big enough that
// UI elements render at realistic desktop dimensions when zoomed in.

const FRAME_W = 1440;
const FRAME_H = 900;

function Frame({ url, children }) {
  return (
    <div className="bz">
      <div className="bz-chrome">
        <div className="bz-dots"><i></i><i></i><i></i></div>
        <div className="bz-url">{url}</div>
        <div style={{ width: 60 }} />
      </div>
      <div className="bz-body">{children}</div>
    </div>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="irosca" title="iRosca · 5 màn hình" subtitle="Dashboard · Group Detail · Create Group · Profile · Landing">
        <DCArtboard id="landing" label="01 · Landing" width={FRAME_W} height={FRAME_H}>
          <Frame url="irosca.chainora.finance"><LandingScreen /></Frame>
        </DCArtboard>
        <DCArtboard id="dashboard" label="02 · Dashboard" width={FRAME_W} height={FRAME_H}>
          <Frame url="app.chainora.finance/rosca/dashboard"><DashboardScreen /></Frame>
        </DCArtboard>
        <DCArtboard id="group-detail" label="03 · Group Detail" width={FRAME_W} height={2320}>
          <Frame url="app.chainora.finance/rosca/group/0xp00l…71d9"><GroupDetailScreen /></Frame>
        </DCArtboard>
        <DCArtboard id="create-group-1" label="04a · Create Group · 01 Cơ bản" width={FRAME_W} height={FRAME_H}>
          <Frame url="app.chainora.finance/rosca/create-group?step=1"><CreateGroupStep1 /></Frame>
        </DCArtboard>
        <DCArtboard id="create-group-2" label="04b · Create Group · 02 Nhịp & vòng" width={FRAME_W} height={1100}>
          <Frame url="app.chainora.finance/rosca/create-group?step=2"><CreateGroupStep2 /></Frame>
        </DCArtboard>
        <DCArtboard id="create-group-3" label="04c · Create Group · 03 Tài chính" width={FRAME_W} height={1080}>
          <Frame url="app.chainora.finance/rosca/create-group?step=3"><CreateGroupStep3 /></Frame>
        </DCArtboard>
        <DCArtboard id="create-group-4" label="04d · Create Group · 04 Xem lại & ký" width={FRAME_W} height={1200}>
          <Frame url="app.chainora.finance/rosca/create-group?step=4"><CreateGroupStep4 /></Frame>
        </DCArtboard>
        <DCArtboard id="profile" label="05 · Profile" width={FRAME_W} height={FRAME_H}>
          <Frame url="app.chainora.finance/rosca/profile"><ProfileScreen /></Frame>
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
