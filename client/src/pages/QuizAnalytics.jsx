import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

const QuizAnalytics = () => {
    const { id: quizId } = useParams();
    const navigate = useNavigate();

    const [analytics, setAnalytics] = useState(null);
    const [quizDetails, setQuizDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [questionFilter, setQuestionFilter] = useState("all"); // 'all', 'high', 'baseline', 'critical'
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchAnalyticsAndQuiz = async () => {
            try {
                setLoading(true);
                setError("");

                // Fetch Quiz details to get the title and general info
                const quizRes = await api.get(`/quizzes/${quizId}`);
                if (quizRes.data?.success) {
                    setQuizDetails(quizRes.data.data);
                }

                // Fetch Analytics aggregation data
                const analyticsRes = await api.get(`/analytics/professor/${quizId}`);
                if (analyticsRes.data?.success) {
                    setAnalytics(analyticsRes.data.data);
                } else {
                    setError("Failed to fetch analytics data.");
                }
            } catch (err) {
                console.error(err);
                setError(
                    err.response?.data?.message || "Error communication with server."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchAnalyticsAndQuiz();
    }, [quizId]);

    // Helper: Calculate most missed concept tag
    const getMostMissedConcept = () => {
        if (!analytics || !analytics.questionBreakdown || analytics.questionBreakdown.length === 0) {
            return { tag: "N/A", accuracy: null };
        }

        const tagStats = {};
        analytics.questionBreakdown.forEach((q) => {
            if (q.tags && Array.isArray(q.tags)) {
                q.tags.forEach((tag) => {
                    const cleanTag = tag.trim().toLowerCase();
                    if (!tagStats[cleanTag]) {
                        tagStats[cleanTag] = { correct: 0, total: 0, originalName: tag };
                    }
                    const totalQAnswers = q.correctCount + q.incorrectCount;
                    tagStats[cleanTag].correct += q.correctCount;
                    tagStats[cleanTag].total += totalQAnswers;
                });
            }
        });

        let foundTag = null;
        let lowestAccuracy = 100;

        Object.keys(tagStats).forEach((tag) => {
            const stats = tagStats[tag];
            if (stats.total > 0) {
                const accuracy = (stats.correct / stats.total) * 100;
                if (accuracy < lowestAccuracy) {
                    lowestAccuracy = accuracy;
                    foundTag = stats.originalName;
                }
            }
        });

        if (foundTag && lowestAccuracy < 100) {
            return { tag: foundTag, accuracy: Math.round(lowestAccuracy) };
        } else if (foundTag) {
            return { tag: foundTag, accuracy: 100 };
        }

        return { tag: "None", accuracy: null };
    };

    const { tag: missedTag, accuracy: missedAccuracy } = getMostMissedConcept();

    // Filter and search questions
    const getFilteredQuestions = () => {
        if (!analytics || !analytics.questionBreakdown) return [];

        return analytics.questionBreakdown.filter((q) => {
            // Search matches question text or tags
            const matchesSearch =
                q.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (q.tags && q.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

            if (!matchesSearch) return false;

            // Filter matches mastery tier
            if (questionFilter === "high") return q.correctPercentage > 80;
            if (questionFilter === "baseline") return q.correctPercentage >= 50 && q.correctPercentage <= 80;
            if (questionFilter === "critical") return q.correctPercentage < 50;

            return true;
        });
    };

    const filteredQuestions = getFilteredQuestions();

    // Helper for color coding mastery tiers
    const getMasteryTier = (percentage) => {
        if (percentage > 80) {
            return {
                label: "High Mastery",
                textClass: "text-emerald-600 dark:text-emerald-400",
                bgClass: "bg-emerald-50 dark:bg-emerald-950/25",
                borderClass: "border-emerald-500/20",
                barClass: "bg-emerald-500",
            };
        }
        if (percentage >= 50) {
            return {
                label: "Baseline",
                textClass: "text-amber-600 dark:text-amber-400",
                bgClass: "bg-amber-50 dark:bg-amber-950/25",
                borderClass: "border-amber-500/20",
                barClass: "bg-amber-500",
            };
        }
        return {
            label: "Critical Focus",
            textClass: "text-rose-600 dark:text-rose-400",
            bgClass: "bg-rose-50 dark:bg-rose-950/25",
            borderClass: "border-rose-500/20",
            barClass: "bg-rose-500",
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh]">
                <svg className="w-12 h-12 animate-spin text-cyan-400 mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-slate-600 dark:text-slate-400 text-sm font-semibold tracking-wider uppercase">Loading Analytics Pipeline...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-16 text-center">
                <div className="inline-flex p-4 bg-red-50 dark:bg-red-950/20 border border-red-500/30 text-red-700 dark:text-red-400 rounded-full mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Analytics Retrieval Failed</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
                <button
                    onClick={() => navigate("/dashboard")}
                    className="px-6 py-2.5 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300 dark:hover:bg-slate-950 transition-all duration-200"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    // Calculate percentages for adaptive paths
    const totalAdaptive = (analytics?.adaptiveDistribution?.remediation || 0) +
        (analytics?.adaptiveDistribution?.enrichment || 0) +
        (analytics?.adaptiveDistribution?.none || 0);

    const getAdaptivePercentage = (val) => {
        if (!totalAdaptive) return 0;
        return Math.round((val / totalAdaptive) * 100);
    };

    const remPercent = getAdaptivePercentage(analytics?.adaptiveDistribution?.remediation);
    const enrPercent = getAdaptivePercentage(analytics?.adaptiveDistribution?.enrichment);
    const nonePercent = getAdaptivePercentage(analytics?.adaptiveDistribution?.none);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
            {/* Back & Title Header */}
            <div className="mb-8">
                <button
                    onClick={() => navigate("/dashboard")}
                    className="inline-flex items-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 mb-4 cursor-pointer group"
                >
                    <svg className="w-4 h-4 mr-1 transform group-hover:translate-x-[-2px] transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    BACK TO DASHBOARD
                </button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1
                            className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent"
                            style={{ fontFamily: "var(--font-display)" }}
                        >
                            Quiz Performance Analytics
                        </h1>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Quiz: <span className="text-slate-800 dark:text-white font-semibold">{quizDetails?.title || "Loading..."}</span>
                        </p>
                    </div>
                    <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-slate-800/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span>Live Aggregation Active</span>
                    </div>
                </div>
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {/* Card 1: Total Submissions */}
                <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden group hover:border-cyan-500/25 transition-all duration-300">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Total Submissions</p>
                        <h3 className="text-4xl font-black text-slate-800 dark:text-white">{analytics?.totalAttempts || 0}</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Completed student attempts</p>
                    </div>
                    <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                </div>

                {/* Card 2: Average Class Accuracy */}
                <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden group hover:border-emerald-500/25 transition-all duration-300">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Class Average Score</p>
                        <h3 className="text-4xl font-black text-slate-800 dark:text-white">
                            {analytics?.totalAttempts > 0 ? `${analytics.averageScore}%` : "0%"}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                            Range: {analytics?.lowestScore || 0}% - {analytics?.highestScore || 0}%
                        </p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                        </svg>
                    </div>
                </div>

                {/* Card 3: Most Missed Concept Tag */}
                <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden group hover:border-rose-500/25 transition-all duration-300">
                    <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase mb-1">Most Missed Concept</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white capitalize truncate max-w-[200px]" title={missedTag}>
                            {missedTag}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                            {missedAccuracy !== null ? `Accuracy: ${missedAccuracy}%` : "No tags recorded yet"}
                        </p>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800/30 text-rose-600 dark:text-rose-400 rounded-xl">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Adaptive Performance Distribution */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="glass-card p-6 h-full flex flex-col justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Adaptive Engine Triggers</h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
                                Distribution of student paths computed by the Phase 4 Adaptive Difficulty Engine.
                            </p>

                            {/* Proportional Stacked Bar Chart */}
                            <div className="h-10 w-full rounded-xl overflow-hidden flex mb-8 border border-slate-300 dark:border-slate-900 shadow-inner">
                                {analytics?.totalAttempts > 0 ? (
                                    <>
                                        {analytics?.adaptiveDistribution?.remediation > 0 && (
                                            <div
                                                style={{ width: `${remPercent}%` }}
                                                className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-500 relative group cursor-pointer"
                                                title={`Remediation: ${analytics.adaptiveDistribution.remediation} students (${remPercent}%)`}
                                            />
                                        )}
                                        {analytics?.adaptiveDistribution?.none > 0 && (
                                            <div
                                                style={{ width: `${nonePercent}%` }}
                                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500 relative group cursor-pointer"
                                                title={`Standard Path: ${analytics.adaptiveDistribution.none} students (${nonePercent}%)`}
                                            />
                                        )}
                                        {analytics?.adaptiveDistribution?.enrichment > 0 && (
                                            <div
                                                style={{ width: `${enrPercent}%` }}
                                                className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full transition-all duration-500 relative group cursor-pointer"
                                                title={`Enrichment: ${analytics.adaptiveDistribution.enrichment} students (${enrPercent}%)`}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full bg-slate-200 dark:bg-slate-900 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                                        No attempt submissions recorded
                                    </div>
                                )}
                            </div>

                            {/* Path Details Cards */}
                            <div className="space-y-4">
                                {/* Enrichment Card */}
                                <div className="p-4 rounded-xl border border-teal-500/10 bg-teal-50 dark:bg-teal-950/10 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500"></span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">Enrichment Path</p>
                                            <p className="text-[10px] text-slate-600 dark:text-slate-400">Scores &gt; 85% — Advanced deck</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                            {analytics?.adaptiveDistribution?.enrichment || 0}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{enrPercent}%</p>
                                    </div>
                                </div>

                                {/* Standard Card */}
                                <div className="p-4 rounded-xl border border-blue-500/10 bg-blue-50 dark:bg-blue-950/10 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="w-3.5 h-3.5 rounded-full bg-blue-500"></span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">Standard Path</p>
                                            <p className="text-[10px] text-slate-600 dark:text-slate-400">Scores 50% - 85% — Baseline deck</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-blue-600 dark:text-blue-400">
                                            {analytics?.adaptiveDistribution?.none || 0}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{nonePercent}%</p>
                                    </div>
                                </div>

                                {/* Remediation Card */}
                                <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-50 dark:bg-amber-950/10 flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <span className="w-3.5 h-3.5 rounded-full bg-amber-500"></span>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">Remediation Path</p>
                                            <p className="text-[10px] text-slate-600 dark:text-slate-400">Scores &lt; 50% — Supportive deck</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                                            {analytics?.adaptiveDistribution?.remediation || 0}
                                        </p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{remPercent}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-300 dark:border-slate-800/60 mt-6 text-center">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Phase 4 Adaptive Engine triggers dynamically from database indices
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Item Analysis Matrix */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-6">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Item Analysis Matrix</h2>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    Question-level breakdown to isolate class gaps and conceptual failure points.
                                </p>
                            </div>

                            {/* Search input */}
                            <div className="relative w-full md:w-64">
                                <input
                                    type="text"
                                    placeholder="Search questions or tags..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950/60 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                />
                                <svg className="w-4 h-4 absolute right-3 top-2.5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        {/* Matrix Filter Tabs */}
                        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-slate-300 dark:border-slate-800/60">
                            {[
                                { id: "all", label: "All Questions" },
                                { id: "high", label: "High Mastery (>80%)" },
                                { id: "baseline", label: "Baseline (50%-80%)" },
                                { id: "critical", label: "Critical Focus (<50%)" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setQuestionFilter(tab.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${questionFilter === tab.id
                                            ? "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-md"
                                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-950/30 border border-transparent"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Questions List */}
                        {filteredQuestions.length === 0 ? (
                            <div className="text-center py-16 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/10">
                                <svg className="mx-auto h-10 w-10 text-slate-400 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">No questions found matching your filter criteria.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {filteredQuestions.map((q, index) => {
                                    const tier = getMasteryTier(q.correctPercentage);
                                    return (
                                        <div
                                            key={q.questionId || index}
                                            className={`p-5 rounded-2xl border ${tier.borderClass} ${tier.bgClass} transition-all duration-200 hover:translate-x-[2px]`}
                                        >
                                            <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed">
                                                        {q.text}
                                                    </h4>
                                                    {/* Tags */}
                                                    {q.tags && q.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                                            {q.tags.map((tag) => (
                                                                <span
                                                                    key={tag}
                                                                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-950/40 text-[10px] font-semibold text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800/60 uppercase tracking-wider"
                                                                >
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Mastery Badge */}
                                                <div className="text-right flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${tier.textClass} border ${tier.borderClass} bg-slate-100 dark:bg-slate-950/40`}>
                                                        {tier.label}
                                                    </span>
                                                    <span className="text-lg font-black text-slate-800 dark:text-white">
                                                        {Math.round(q.correctPercentage)}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Proportional accuracy bar */}
                                            <div className="space-y-1.5">
                                                <div className="h-2 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden flex">
                                                    <div
                                                        style={{ width: `${q.correctPercentage}%` }}
                                                        className={`${tier.barClass} h-full transition-all duration-500`}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                                                    <span>{q.correctCount} Correct Responses</span>
                                                    <span>{q.incorrectCount} Incorrect Distractors</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuizAnalytics;
