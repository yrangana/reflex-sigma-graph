import React, { Suspense, lazy, useEffect, useState } from 'react';

// Lazy load the actual component
// We use a relative import assuming both files are in the same directory (custom_components)
const SigmaGraphViewer = lazy(() => import('./SigmaGraphViewer.jsx'));

export default function SigmaGraphWrapper(props) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null; // Render nothing on server
    }

    return (
        <Suspense fallback={<div style={{ width: '100%', height: '600px', background: '#f0f0f0' }}>Loading Graph...</div>}>
            <SigmaGraphViewer {...props} />
        </Suspense>
    );
}
