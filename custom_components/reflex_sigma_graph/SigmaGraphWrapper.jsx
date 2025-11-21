import React, { useEffect, useState } from 'react';
import SigmaGraphViewer from './SigmaGraphViewer.jsx';

export default function SigmaGraphWrapper(props) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return null; // Render nothing on server
    }

    return (
        <SigmaGraphViewer {...props} />
    );
}
