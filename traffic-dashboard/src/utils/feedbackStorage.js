// Feedback Storage using localStorage
const STORAGE_KEY = 'traffic_feedback_data';

/**
 * Feedback data structure:
 * {
 *   roadId: string,
 *   roadName: string,
 *   segment: string,
 *   predicted: string,
 *   actual: string,
 *   isCorrect: boolean,
 *   speed: number,
 *   delayRatio: number,
 *   timestamp: number,
 *   hour: number,
 *   dayOfWeek: number,
 *   isRushHour: boolean,
 *   isWeekend: boolean
 * }
 */

export function saveFeedback(feedback) {
    try {
        const feedbacks = getFeedbacks();
        feedbacks.push({
            ...feedback,
            timestamp: Date.now(),
            id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbacks));
        console.log('✅ Feedback saved:', feedback);
        return true;
    } catch (error) {
        console.error('❌ Failed to save feedback:', error);
        return false;
    }
}

export function getFeedbacks(filters = {}) {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        let feedbacks = data ? JSON.parse(data) : [];

        // Apply filters
        if (filters.roadId) {
            feedbacks = feedbacks.filter(f => f.roadId === filters.roadId);
        }
        if (filters.since) {
            feedbacks = feedbacks.filter(f => f.timestamp >= filters.since);
        }
        if (filters.limit) {
            feedbacks = feedbacks.slice(-filters.limit);
        }

        return feedbacks;
    } catch (error) {
        console.error('❌ Failed to get feedbacks:', error);
        return [];
    }
}

export function getAccuracyStats(roadId = null) {
    const feedbacks = roadId ? getFeedbacks({ roadId }) : getFeedbacks();

    if (feedbacks.length === 0) {
        return {
            total: 0,
            correct: 0,
            incorrect: 0,
            accuracy: 0
        };
    }

    const correct = feedbacks.filter(f => f.isCorrect).length;
    const incorrect = feedbacks.length - correct;
    const accuracy = (correct / feedbacks.length) * 100;

    return {
        total: feedbacks.length,
        correct,
        incorrect,
        accuracy: parseFloat(accuracy.toFixed(1))
    };
}

export function getRoadStats() {
    const feedbacks = getFeedbacks();
    const roadStats = {};

    feedbacks.forEach(f => {
        if (!roadStats[f.roadId]) {
            roadStats[f.roadId] = {
                roadName: f.roadName,
                total: 0,
                correct: 0
            };
        }
        roadStats[f.roadId].total++;
        if (f.isCorrect) roadStats[f.roadId].correct++;
    });

    // Calculate accuracy for each road
    Object.keys(roadStats).forEach(roadId => {
        const stats = roadStats[roadId];
        stats.accuracy = (stats.correct / stats.total) * 100;
        stats.accuracy = parseFloat(stats.accuracy.toFixed(1));
    });

    return roadStats;
}

export function clearFeedbacks() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log('✅ All feedbacks cleared');
        return true;
    } catch (error) {
        console.error('❌ Failed to clear feedbacks:', error);
        return false;
    }
}

export function exportFeedbacks() {
    const feedbacks = getFeedbacks();
    const dataStr = JSON.stringify(feedbacks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `traffic-feedback-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
    console.log('✅ Feedbacks exported');
}
