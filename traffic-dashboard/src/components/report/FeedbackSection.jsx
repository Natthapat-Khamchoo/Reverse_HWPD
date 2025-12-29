import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { saveFeedback, getAccuracyStats } from '../../utils/feedbackStorage';

export default function FeedbackSection({ reportText, reportMetadata, direction }) {
    const [showCorrectionModal, setShowCorrectionModal] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    const stats = getAccuracyStats();

    const handleCorrectAll = () => {
        if (!reportMetadata || reportMetadata.length === 0) {
            console.warn('No metadata available for feedback');
            return;
        }

        // Save feedback for all roads as correct
        const now = new Date();
        reportMetadata.forEach(road => {
            saveFeedback({
                roadId: road.roadId,
                roadName: road.roadName,
                predicted: road.predictedStatus,
                actual: road.predictedStatus, // Same as predicted = correct
                isCorrect: true,
                timestamp: Date.now(),
                hour: now.getHours(),
                dayOfWeek: now.getDay(),
                isRushHour: (now.getHours() >= 7 && now.getHours() < 9) || (now.getHours() >= 17 && now.getHours() < 19),
                isWeekend: now.getDay() === 0 || now.getDay() === 6,
                region: road.region
            });
        });

        setFeedbackSubmitted(true);
        setTimeout(() => setFeedbackSubmitted(false), 2000);
    };

    const handleWrong = () => {
        if (!reportMetadata || reportMetadata.length === 0) {
            alert('ไม่พบข้อมูลรายงาน');
            return;
        }
        setShowCorrectionModal(true);
    };

    const submitCorrection = (roadData, actualStatus) => {
        const now = new Date();
        saveFeedback({
            roadId: roadData.roadId,
            roadName: roadData.roadName,
            predicted: roadData.predictedStatus,
            actual: actualStatus,
            isCorrect: roadData.predictedStatus === actualStatus,
            timestamp: Date.now(),
            hour: now.getHours(),
            dayOfWeek: now.getDay(),
            isRushHour: (now.getHours() >= 7 && now.getHours() < 9) || (now.getHours() >= 17 && now.getHours() < 19),
            isWeekend: now.getDay() === 0 || now.getDay() === 6,
            region: roadData.region
        });

        setShowCorrectionModal(false);
        setFeedbackSubmitted(true);
        setTimeout(() => setFeedbackSubmitted(false), 2000);
    };

    return (
        <>
            <div className="p-4 bg-slate-900/50 border-t border-slate-700">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-slate-400">
                        <span className="font-semibold text-slate-300">ช่วยประเมินความแม่นยำ:</span>
                        {stats.total > 0 && (
                            <span className="ml-2 text-green-400">
                                ({stats.correct}/{stats.total} = {stats.accuracy}% แม่น)
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleCorrectAll}
                        disabled={feedbackSubmitted || !reportMetadata}
                        className="flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all bg-green-600 hover:bg-green-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ThumbsUp size={18} />
                        ✅ ถูกต้องทุกถนน
                    </button>

                    <button
                        onClick={handleWrong}
                        disabled={feedbackSubmitted || !reportMetadata}
                        className="flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all bg-orange-600 hover:bg-orange-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ThumbsDown size={18} />
                        ❌ มีถนนผิด
                    </button>
                </div>

                {feedbackSubmitted && (
                    <div className="mt-2 text-center text-sm text-green-400 animate-pulse">
                        ✅ บันทึก feedback แล้ว!
                    </div>
                )}

                <p className="mt-2 text-xs text-slate-500 text-center">
                    💡 ข้อมูล feedback จะช่วยปรับปรุงความแม่นยำในอนาคต
                </p>
            </div>

            {/* Correction Modal */}
            {showCorrectionModal && reportMetadata && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-xl border border-slate-600 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                        <div className="p-4 bg-slate-900 border-b border-slate-700 flex justify-between items-center">
                            <h4 className="text-white font-bold">เลือกถนนที่ต้องการแก้ไข</h4>
                            <button
                                onClick={() => setShowCorrectionModal(false)}
                                className="text-slate-400 hover:text-white p-1"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                            <p className="text-sm text-slate-300 mb-4">
                                กรุณาเลือกถนนที่การทำนายไม่ถูกต้อง แล้วระบุสภาพจราจรจริง
                            </p>

                            <div className="space-y-3">
                                {reportMetadata.map((road, index) => (
                                    <div key={index} className="p-3 bg-slate-900 rounded-lg border border-slate-700">
                                        <div className="text-white font-semibold mb-1">{road.roadName}</div>
                                        <div className="text-xs text-slate-500 mb-2">{road.region}</div>
                                        <div className="text-sm text-slate-400 mb-3">
                                            การทำนาย: <span className="font-semibold">{road.emoji} {road.predictedStatus}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mb-2">สภาพจราจรจริง:</div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => submitCorrection(road, 'คล่องตัว')}
                                                className="flex-1 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 text-white transition-colors"
                                            >
                                                ✅ คล่องตัว
                                            </button>
                                            <button
                                                onClick={() => submitCorrection(road, 'หนาแน่น')}
                                                className="flex-1 py-1.5 text-xs rounded bg-yellow-600 hover:bg-yellow-500 text-white transition-colors"
                                            >
                                                🟡 หนาแน่น
                                            </button>
                                            <button
                                                onClick={() => submitCorrection(road, 'ติดขัด')}
                                                className="flex-1 py-1.5 text-xs rounded bg-red-600 hover:bg-red-500 text-white transition-colors"
                                            >
                                                🔴 ติดขัด
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 pt-4 border-t border-slate-700">
                                <button
                                    onClick={() => setShowCorrectionModal(false)}
                                    className="w-full py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
                                >
                                    ปิด
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
