/**
 * Test component to demonstrate remote logging
 *
 * This can be imported in App.tsx or any component to test logging
 */

import { useEffect } from 'react';
import { remoteLogger } from '../utils/remote-logger';

export function TestRemoteLogging() {
  useEffect(() => {
    // Test different log levels
    remoteLogger.trace('Trace message from component mount', { test: 'data' }, 'TestRemoteLogging');
    remoteLogger.debug('Debug message with debug info', { debugData: { x: 1, y: 2 } }, 'TestRemoteLogging');
    remoteLogger.info('Component mounted successfully', { component: 'TestRemoteLogging' }, 'TestRemoteLogging');

    // Simulate a warning
    setTimeout(() => {
      remoteLogger.warn('Warning: Simulated warning after 2 seconds', { warningType: 'test' }, 'TestRemoteLogging');
    }, 2000);

    // Simulate an error (will flush immediately)
    setTimeout(() => {
      try {
        throw new Error('Simulated error for testing');
      } catch (error) {
        remoteLogger.error('Caught error in component', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }, 'TestRemoteLogging');
      }
    }, 4000);

    return () => {
      remoteLogger.info('Component unmounted', {}, 'TestRemoteLogging');
    };
  }, []);

  return (
    <div style={{ padding: '20px', background: '#f0f0f0', margin: '10px', borderRadius: '5px' }}>
      <h3>Remote Logging Test</h3>
      <p>Check browser console and backend logs for log entries.</p>
      <p>Session ID: {sessionStorage.getItem('terrainsim-session-id')}</p>
      <ul>
        <li>✅ Trace log sent</li>
        <li>✅ Debug log sent</li>
        <li>✅ Info log sent</li>
        <li>⏳ Warning log in 2 seconds...</li>
        <li>⏳ Error log in 4 seconds...</li>
      </ul>
      <button onClick={() => remoteLogger.info('Manual log button clicked', { timestamp: Date.now() }, 'TestRemoteLogging')}>
        Send Manual Log
      </button>
    </div>
  );
}
