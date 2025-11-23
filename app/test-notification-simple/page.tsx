'use client';

import { useState, useEffect } from 'react';

export default function SimpleTestPage() {
  const [permission, setPermission] = useState<string>('checking');
  const [result, setResult] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    } else {
      setPermission('not-supported');
    }
  }, []);

  const testDirect = async () => {
    console.log('=== DIRECT TEST START ===');
    console.log('Window:', typeof window !== 'undefined' ? 'exists' : 'missing');
    console.log('Notification API:', 'Notification' in window ? 'exists' : 'missing');
    console.log('Current permission:', Notification.permission);
    
    try {
      console.log('Calling Notification.requestPermission()...');
      const result = await Notification.requestPermission();
      console.log('Result:', result);
      setPermission(result);
      setResult(`Permission: ${result}`);
      
      if (result === 'granted') {
        // Try to show a test notification
        new Notification('Test Notification', {
          body: 'If you see this, notifications are working!',
          icon: '/logo.png',
        });
      }
    } catch (error: any) {
      console.error('Error:', error);
      setResult(`Error: ${error.message}`);
    }
    console.log('=== DIRECT TEST END ===');
  };

  const testViaButton = () => {
    console.log('Button clicked via onClick');
    testDirect();
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Simple Notification Test</h1>
      
      <div style={{ marginBottom: '20px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2>Current Status</h2>
        <p><strong>Permission:</strong> {permission}</p>
        <p><strong>Window:</strong> {typeof window !== 'undefined' ? '✅' : '❌'}</p>
        <p><strong>Notification API:</strong> {'Notification' in window ? '✅' : '❌'}</p>
        <p><strong>URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={testViaButton}
          onTouchStart={() => console.log('Touch start')}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '10px'
          }}
        >
          Test Direct Permission Request
        </button>
        
        <button
          onClick={() => {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Manual Test', {
                body: 'This is a manual test notification',
                icon: '/logo.png',
              });
              setResult('Notification sent!');
            } else {
              setResult('Permission not granted. Current: ' + Notification.permission);
            }
          }}
          style={{
            padding: '15px 30px',
            fontSize: '18px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Send Test Notification (if granted)
        </button>
      </div>

      {result && (
        <div style={{ 
          padding: '15px', 
          background: result.includes('Error') ? '#f8d7da' : '#d4edda',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <p>{result}</p>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Click the blue button above</li>
          <li>Check browser console (if possible) for logs</li>
          <li>If permission popup appears, click "Allow"</li>
          <li>If no popup, try the lock icon method:
            <ul>
              <li>Tap lock/info icon in address bar</li>
              <li>Go to Site settings → Notifications</li>
              <li>Change to "Allow"</li>
            </ul>
          </li>
        </ol>
      </div>

      <div style={{ marginTop: '20px', padding: '15px', background: '#e7f3ff', borderRadius: '8px', fontSize: '12px' }}>
        <h4>Debug Info:</h4>
        <pre style={{ overflow: 'auto', fontSize: '11px' }}>
          {JSON.stringify({
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
            platform: typeof navigator !== 'undefined' ? navigator.platform : 'N/A',
            url: typeof window !== 'undefined' ? window.location.href : 'N/A',
            origin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
            permission: permission,
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}

