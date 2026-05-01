import React, { useState } from 'react';
import { apiPostForm } from '../api';

export default function Reconcile() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleReconcile = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('statement', file);
      const data = await apiPostForm('/reconcile', fd);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{marginBottom: '0.5rem'}}>Bank Reconciliation</h1>
      <p style={{color: 'var(--text-muted)', marginBottom: '2rem'}}>Upload a CSV bank statement to auto-verify pending UPI payments</p>
      
      <div className="card" style={{maxWidth: '600px'}}>
        <h3 style={{marginBottom: '1rem'}}>Upload Bank Statement</h3>
        <p style={{marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6}}>
          The system will match pending UPI payments against bank transactions using:
        </p>
        <ul style={{color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', paddingLeft: '1.25rem', lineHeight: 1.8}}>
          <li><strong>Exact amount</strong> + <strong>UPI reference ID</strong> (primary match)</li>
          <li><strong>Same amount</strong> within <strong>±2 days</strong> of payment date (fallback)</li>
        </ul>

        <div style={{marginBottom: '1rem', padding: '1.5rem', border: '2px dashed var(--border-color)', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s'}} 
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--primary)'; }}
          onDragLeave={e => { e.currentTarget.style.borderColor='var(--border-color)'; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor='var(--border-color)'; if(e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
          onClick={() => document.getElementById('csv-file-input').click()}
        >
          <input id="csv-file-input" type="file" accept=".csv" style={{display: 'none'}} onChange={(e) => setFile(e.target.files[0])} />
          <div style={{fontSize: '2rem', marginBottom: '0.5rem'}}>📄</div>
          {file ? (
            <p style={{fontWeight: '500', color: 'var(--text-main)'}}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
          ) : (
            <p style={{color: 'var(--text-muted)'}}>Click or drag a <strong>.csv</strong> file here</p>
          )}
        </div>

        <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
          Expected CSV columns: <code style={{background: '#F3F4F6', padding: '0.15rem 0.4rem', borderRadius: '4px'}}>date, amount, description</code> or <code style={{background: '#F3F4F6', padding: '0.15rem 0.4rem', borderRadius: '4px'}}>date, amount, reference_id</code>
        </p>

        <button id="reconcile-btn" className="button" onClick={handleReconcile} disabled={!file || loading} style={{width: '100%'}}>
          {loading ? 'Processing...' : 'Start Reconciliation'}
        </button>

        {error && (
          <div style={{marginTop: '1.5rem', padding: '1rem', background: '#FEE2E2', borderRadius: '8px', color: '#DC2626', fontSize: '0.875rem'}}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div style={{marginTop: '1.5rem', padding: '1.25rem', background: '#D1FAE5', borderRadius: '12px'}}>
            <h3 style={{color: '#065F46', marginBottom: '0.75rem', fontSize: '1rem'}}>✅ Reconciliation Complete</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: '700', color: '#065F46'}}>{result.verifiedCount}</div>
                <div style={{fontSize: '0.8rem', color: '#047857'}}>Verified</div>
              </div>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: '700', color: '#065F46'}}>{result.totalPendingProcessed}</div>
                <div style={{fontSize: '0.8rem', color: '#047857'}}>Pending Evaluated</div>
              </div>
              <div>
                <div style={{fontSize: '1.5rem', fontWeight: '700', color: '#065F46'}}>{result.totalBankTransactions}</div>
                <div style={{fontSize: '0.8rem', color: '#047857'}}>Bank Transactions</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
