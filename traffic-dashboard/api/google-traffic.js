export default async function handler(req, res) {
    const { start, end } = req.query;

    // Validate inputs
    if (!start || !end) {
        return res.status(400).json({
            error: 'BAD_REQUEST',
            message: 'Missing start or end coordinates'
        });
    }

    const [slat, slon] = start.split(',');
    const [elat, elon] = end.split(',');

    const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_KEY) {
        return res.status(500).json({
            error: 'SERVER_ERROR',
            message: 'Google API key not configured'
        });
    }

    // Build Google Maps Distance Matrix API URL
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${slat},${slon}&destinations=${elat},${elon}&departure_time=now&traffic_model=best_guess&key=${GOOGLE_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        // Check for API errors
        if (data.status === 'OVER_QUERY_LIMIT') {
            console.log('⚠️ Google API quota exceeded');
            return res.status(429).json({
                error: 'OVER_QUERY_LIMIT',
                message: 'Google quota exceeded, please use Longdo fallback'
            });
        }

        if (data.status !== 'OK') {
            console.error('Google API error:', data.status);
            return res.status(500).json({
                error: 'GOOGLE_API_ERROR',
                message: data.error_message || data.status
            });
        }

        // Parse response
        const element = data.rows[0]?.elements[0];

        if (!element || element.status !== 'OK') {
            return res.status(404).json({
                error: 'NO_ROUTE',
                message: 'No route found between coordinates'
            });
        }

        // Calculate traffic delay
        const normalDuration = element.duration.value; // seconds
        const trafficDuration = element.duration_in_traffic.value; // seconds
        const delayRatio = (trafficDuration - normalDuration) / normalDuration;

        // Determine traffic status based on delay
        let status = "คล่องตัว";
        let code = 1;

        // More sensitive thresholds for Google data
        if (delayRatio > 0.5 || trafficDuration / normalDuration > 1.8) {
            // 50% slower or 80% increase
            status = "ติดขัด";
            code = 3;
        } else if (delayRatio > 0.2 || trafficDuration / normalDuration > 1.3) {
            // 20% slower or 30% increase
            status = "หนาแน่น";
            code = 2;
        }

        console.log(`✅ Google Maps: ${status} (delay: ${(delayRatio * 100).toFixed(1)}%)`);

        return res.status(200).json({
            status,
            code,
            source: 'google',
            delayRatio: parseFloat(delayRatio.toFixed(3)),
            normalDuration,
            trafficDuration,
            distance: element.distance.value
        });

    } catch (error) {
        console.error('Google API request failed:', error);
        return res.status(500).json({
            error: 'REQUEST_FAILED',
            message: error.message
        });
    }
}
