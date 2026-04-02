import '../styles/TroubleshootingTips.css';

export default function TroubleshootingTips() {
  return (
    <div className="tips">
      <h3 className="tips__title">Troubleshooting Tips</h3>
      <div className="tips__body">
        <p><strong>If you're getting network errors:</strong></p>
        <ul>
          <li>Check your internet connection</li>
          <li>Make sure you're using Chrome, Edge, or Safari</li>
          <li>The Web Speech API requires an internet connection to work</li>
          <li>Some browsers block speech recognition on non-HTTPS sites</li>
          <li>Try refreshing the page</li>
        </ul>

        <p><strong>Best practices:</strong></p>
        <ul>
          <li>Speak clearly and at a normal pace</li>
          <li>Reduce background noise if possible</li>
          <li>Make sure your microphone is working properly</li>
          <li>Wait for the "Listening..." indicator before speaking</li>
        </ul>
      </div>
    </div>
  );
}
