import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { ScreenProps } from '../../../navigation/routes';
import { getChapterById } from '../data/lessonData';
import { useQuizSessionStore } from '../store/quizSessionStore';
import { useGamificationStore } from '../../gamification/store/gamificationStore';

const DEFAULT_MAX_ATTEMPTS = 3;

export default function QuizScreen({ route, navigation }: ScreenProps<'Quiz'>) {
  const { chapterId, nextChapterId } = route.params;

  const result = getChapterById(chapterId);
  const completeChapter = useGamificationStore((state) => state.completeChapter);
  const completedChapters = useGamificationStore((state) => state.completedChapters);
  const loadQuizSessions = useQuizSessionStore((state) => state.load);
  const ensureSession = useQuizSessionStore((state) => state.ensureSession);
  const recordAttempt = useQuizSessionStore((state) => state.recordAttempt);
  const session = useQuizSessionStore((state) => state.sessions[chapterId]);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>();
  const [finished, setFinished] = useState(false);

  const chapter = result?.chapter;
  const quiz = chapter?.quiz ?? [];
  const maxAttempts = chapter?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const currentQuestion = quiz[questionIndex];

  useEffect(() => {
    void loadQuizSessions();
  }, [loadQuizSessions]);

  useEffect(() => {
    if (!chapter) {
      return;
    }

    ensureSession(
      chapter.chapterId,
      chapter.quiz.map((question) => question.id),
    );
  }, [chapter, ensureSession]);

  useEffect(() => {
    if (!currentQuestion || !session) {
      return;
    }

    const saved = session.questionResults[currentQuestion.id];
    setSelectedIndex(saved?.selectedOption);
  }, [currentQuestion, session]);

  const score = useMemo(() => {
    if (!session) {
      return 0;
    }

    return quiz.reduce((total, question) => {
      return total + (session.questionResults[question.id]?.status === 'correct' ? 1 : 0);
    }, 0);
  }, [quiz, session]);

  const completedQuestionCount = useMemo(() => {
    if (!session) {
      return 0;
    }

    return quiz.reduce((total, question) => {
      const status = session.questionResults[question.id]?.status;
      return total + (status === 'correct' || status === 'incorrect' ? 1 : 0);
    }, 0);
  }, [quiz, session]);

  if (!chapter || !currentQuestion) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Quiz not found.</Text>
      </View>
    );
  }

  const currentResult = session?.questionResults[currentQuestion.id];
  const attemptsUsed = currentResult?.attempts ?? 0;
  const isCorrect = currentResult?.status === 'correct';
  const isLockedForNext = currentResult?.status === 'incorrect' && attemptsUsed >= maxAttempts;

  const finishOrNext = () => {
    if (questionIndex < quiz.length - 1) {
      setQuestionIndex((value) => value + 1);
      return;
    }

    setFinished(true);

    const finalScore = score;

    if (finalScore >= chapter.passingScore) {
      completeChapter({
        chapterId: chapter.chapterId,
        nextChapterId,
        starsEarned: chapter.starsReward,
        quizScore: finalScore,
      });
    }
  };

  const handleSubmit = () => {
    if (selectedIndex === undefined) {
      Alert.alert('Choose one answer', 'Please select an answer first.');
      return;
    }

    if (isCorrect || isLockedForNext) {
      finishOrNext();
      return;
    }

    const correct = selectedIndex === currentQuestion.correctAnswerIndex;
    const nextAttempts = attemptsUsed + 1;

    recordAttempt(
      chapter.chapterId,
      currentQuestion.id,
      selectedIndex,
      correct ? 'correct' : 'incorrect',
    );

    if (correct) {
      return;
    }

    if (nextAttempts >= maxAttempts) {
      return;
    }

    setSelectedIndex(undefined);
  };

  if (finished) {
    const passed = score >= chapter.passingScore;
    const alreadyCompleted = Boolean(completedChapters[chapterId]);
    const needsReview = Math.max(quiz.length - score, 0);

    return (
      <View style={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.resultEmoji}>{passed ? '🎉' : '💪'}</Text>
          <Text style={styles.resultTitle}>{passed ? 'Great job!' : 'Keep practicing!'}</Text>
          <Text style={styles.resultText}>
            Correct: {score}/{quiz.length}
          </Text>
          <Text style={styles.resultText}>
            Questions to review: {needsReview}
          </Text>
          <Text style={styles.resultText}>
            Questions completed: {completedQuestionCount}/{quiz.length}
          </Text>

          {passed ? (
            <Text style={styles.rewardText}>
              {alreadyCompleted
                ? 'This chapter is completed. Stars are not duplicated.'
                : `You earned ⭐ ${chapter.starsReward}`}
            </Text>
          ) : (
            <Text style={styles.resultText}>
              Passing score is {chapter.passingScore}/{quiz.length}.
            </Text>
          )}

          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.popToTop()}
          >
            <Text style={styles.primaryButtonText}>Back to Home</Text>
          </Pressable>

          {!passed ? (
            <Pressable
              style={styles.secondaryButton}
              onPress={() => {
                setQuestionIndex(0);
                setSelectedIndex(undefined);
                setFinished(false);
              }}
            >
              <Text style={styles.secondaryButtonText}>Review Quiz</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>
        Question {questionIndex + 1} of {quiz.length}
      </Text>

      <Text style={styles.attemptText}>
        Attempts: {attemptsUsed}/{maxAttempts}
      </Text>

      <Text style={styles.question}>{currentQuestion.question}</Text>

      {currentQuestion.options.map((option, index) => (
        <Pressable
          key={`${currentQuestion.id}-${option}`}
          disabled={isCorrect || isLockedForNext}
          style={[
            styles.option,
            selectedIndex === index && styles.selectedOption,
            isCorrect && index === currentQuestion.correctAnswerIndex && styles.correctOption,
          ]}
          onPress={() => setSelectedIndex(index)}
        >
          <Text
            style={[
              styles.optionText,
              selectedIndex === index && styles.selectedOptionText,
            ]}
          >
            {option}
          </Text>
        </Pressable>
      ))}

      {currentResult?.status === 'incorrect' && !isLockedForNext ? (
        <Text style={styles.feedbackText}>
          ❌ Not quite. Try again. You have {maxAttempts - attemptsUsed} attempt(s) left.
        </Text>
      ) : null}

      {isCorrect ? (
        <Text style={styles.correctFeedback}>⭐ Correct! Great job.</Text>
      ) : null}

      {isLockedForNext ? (
        <Text style={styles.feedbackText}>
          Maximum attempts reached. This question is incomplete and will need review.
        </Text>
      ) : null}

      <Pressable style={styles.primaryButton} onPress={handleSubmit}>
        <Text style={styles.primaryButtonText}>
          {isCorrect || isLockedForNext
            ? questionIndex < quiz.length - 1
              ? 'Next'
              : 'Finish Quiz'
            : 'Check Answer'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 4,
  },
  attemptText: {
    color: '#2563EB',
    fontWeight: '800',
    marginBottom: 14,
  },
  question: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 18,
  },
  option: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  selectedOption: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  correctOption: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A34A',
  },
  optionText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  selectedOptionText: {
    color: '#FFFFFF',
  },
  feedbackText: {
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 21,
  },
  correctFeedback: {
    color: '#16A34A',
    fontWeight: '900',
    marginTop: 4,
    fontSize: 17,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  secondaryButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2563EB',
    padding: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontWeight: '900',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginTop: 40,
  },
  resultEmoji: {
    fontSize: 56,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 10,
  },
  resultText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 16,
    textAlign: 'center',
  },
  rewardText: {
    marginTop: 10,
    color: '#F59E0B',
    fontWeight: '900',
    fontSize: 17,
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
  },
});
