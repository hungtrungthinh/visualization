<?php 

use Phalcon\Mvc\User\Module;
include __DIR__ . "/../library/array_functions.php";

class MasteryHelper extends Module {

	public static function calculateConceptMasteryScore($studentId, $conceptId, $debug = false) {

		// Get questions in concept
		$questionIds = MappingHelper::questionsInConcept($conceptId);

		if ($debug) {
			echo "<h1>Concept ID $conceptId: </h1>";
			print_r($questionIds);
			echo "<hr>";
		}
		
		// Array to hold information about each question (we don't care about essay questions)
		$conceptShortAnswerQuestions = array();
		$conceptMultipleChoiceQuestions = array();

		// Loop through each question and get basic information for each
		foreach ($questionIds as $questionId) {
			// This function returns an array with quizNumber, questionNumber, assessmentId, and questionType (and number of options for a MC q)
			$question = MappingHelper::questionInformation($questionId);

			switch ($question["questionType"]) {
				case "essay":
					// Don't include essay questions in any calculations, so don't add this question to the $conceptQuestions array
					break;
				case "short_answer":
					// Get the number of attempts and correct (no show answer in preceding minute) attempts
					$question["attempts"] = self::countAttemptsForQuestion($studentId, $question["assessmentId"], $question["questionNumber"], $debug);
					$question["correctAttempts"] = self::countCorrectAttemptsForQuestion($studentId, $question["assessmentId"], $question["questionNumber"], $debug);
					$conceptShortAnswerQuestions []= $question;
					break;
				case "multiple_choice":
					// Get the number of attempts and correct (no show answer in preceding minute) attempts
					$question["attempts"] = self::countAttemptsForQuestion($studentId, $question["assessmentId"], $question["questionNumber"], $debug);
					$question["correctAttempts"] = self::countCorrectAttemptsForQuestion($studentId, $question["assessmentId"], $question["questionNumber"], $debug);
					$conceptMultipleChoiceQuestions []= $question;
					break;
			}

		}
		// 1. Short answer questions
			// Total number of short answer questions
			$shortAnswerQuestionCount = count($conceptShortAnswerQuestions);
			// Avoid division by zero if no questions of this type (set scores to 0 for this part, and move on)
			if ($shortAnswerQuestionCount > 0) {
				// 1.a. Calculate initial: correctness factor and attempts penalty
					// Get number of correct short answer questions
					// Use array_filter to get short answer questions with correct attempts > 0
					$shortAnswerCorrectCount = count(array_filter($conceptShortAnswerQuestions, function($question) {
						return ($question["correctAttempts"]["betterCorrect"] > 0);
					}));
					// Get total number of attempts for all short answer questions
					$shortAnswerAttemptCount = array_sum(array_column($conceptShortAnswerQuestions, "attempts"));
					// TODO refactor magic numbers
					// Short answer initial = ( 10 * ( # correct SA in concept / # total SA questions in concept) - (0.2 * (total attempts for all SA questions in concept - number of SA questions in concept) / number of SA questions in concept) )
					$shortAnswerCorrectnessFactor = (10 * ( $shortAnswerCorrectCount / $shortAnswerQuestionCount) );
					$shortAnswerAttemptPenalty = (0.2 * max($shortAnswerAttemptCount - $shortAnswerQuestionCount, 0) / $shortAnswerQuestionCount);

					$shortAnswerInitialScore = max($shortAnswerCorrectnessFactor - $shortAnswerAttemptPenalty, 0);
					if ($debug) {
						echo "Short answer correctness and attempts penalty: ";
						// TODO avoid division by zero if no questions of this type
						// Use max to make sure we don't go below 0
						echo "(10 * ( $shortAnswerCorrectCount / $shortAnswerQuestionCount) ) - (0.2 * max($shortAnswerAttemptCount - $shortAnswerQuestionCount, 0) / $shortAnswerQuestionCount) = $shortAnswerInitialScore \n";
					}
				// 1.b. Calculate practice bonus
					// For questions with > 1 correct statement without a show answer statement in the preceding minute, then add a practice bonus equal to the attempts penalty.
					// 2.a. Short answer questions
					$shortAnswerPracticeBonus = 0;
					// Get short answer questions that have > 1 correct attempt and add a practice bonus for each of them
					foreach ($conceptShortAnswerQuestions as $question) {
						if ($question["correctAttempts"]["betterCorrect"] > 1) {
							$shortAnswerPracticeBonus += 0.2 * ($question["attempts"] - 1) / $shortAnswerQuestionCount;
						}
					}
					if ($debug) {
						echo "Short answer practice bonus: $shortAnswerPracticeBonus \n";
					}
			} else {
				$shortAnswerInitialScore = 0;
				$shortAnswerPracticeBonus = 0;
			}

		// 2 Multiple choice questions
			// Total number of multiple choice questions
			$multipleChoiceQuestionCount = count($conceptMultipleChoiceQuestions);
			// Avoid division by zero if no questions of this type (set scores to 0 for this part, and move on)
			if ($multipleChoiceQuestionCount > 0) {
				// 2.a. Calculate initial: correctness factor and attempts penalty
					// Get number of correct multiple choice questions
					// Use array_filter to get multiple choice questions with correct attempts > 0
					$multipleChoiceCorrectCount = count(array_filter($conceptMultipleChoiceQuestions, function($question) {
						return ($question["correctAttempts"]["betterCorrect"] > 0);
					}));
					// Get total number of attempts for all multiple choice questions
					$multipleChoiceAttemptCount = array_sum(array_column($conceptMultipleChoiceQuestions, "attempts"));
					// TODO refactor magic numbers
					// Multiple choice initial = 10 * ( # correct MC in concept / # total MC questions in concept) - ( ( sum( (question attempts - 1) * (10 / options in question) ) ) / number of MC questions
					$multipleChoiceCorrectnessFactor = (10 * ( $multipleChoiceCorrectCount / $multipleChoiceQuestionCount) );
					// Attempts penalty based on number of attempts for a question as well as how many options that question has
					$multipleChoiceAttemptPenalty = 0;
					// Sum of penalties
					foreach ($conceptMultipleChoiceQuestions as $question) {
						$multipleChoiceAttemptPenalty += ( max($question["attempts"] - 1, 0) * (10 / $question["options"]) );
					}
					// Now average penalty
					$multipleChoiceAttemptPenalty = $multipleChoiceAttemptPenalty / $multipleChoiceQuestionCount;

					$multipleChoiceInitialScore = max($multipleChoiceCorrectnessFactor - $multipleChoiceAttemptPenalty, 0);
					if ($debug) {
						echo "Multiple Choice correctness and attempts penalty: ";
						echo "(10 * ( $multipleChoiceCorrectCount / $multipleChoiceQuestionCount) ) - ($multipleChoiceAttemptPenalty / $multipleChoiceQuestionCount) = $multipleChoiceInitialScore \n";
					}
				// 2.b. Calculate practice bonus
					$multipleChoicePracticeBonus = 0;
					// Get number of multiple choice questions that have > 1 correct attempt and add a practice bonus for each of them
					foreach ($conceptMultipleChoiceQuestions as $question) {
						if ($question["correctAttempts"]["betterCorrect"] > 1) {
							$multipleChoicePracticeBonus += ( ($question["attempts"] - 1) * (10 / $question["options"]) ) / $multipleChoiceQuestionCount;
						}
					}
					if ($debug) {
						echo "Multiple Choice practice bonus: $multipleChoicePracticeBonus \n";
					}
			} else {
				$multipleChoiceInitialScore = 0;
				$multipleChoicePracticeBonus = 0;
			}

		// 3. Calculate total mastery score for each question type: initial + bonus
			$shortAnswerScore = $shortAnswerInitialScore + $shortAnswerPracticeBonus;
			$multipleChoiceScore = $multipleChoiceInitialScore + $multipleChoicePracticeBonus;
		// Weight each question type score by number of questions.
			// Don't use total number of questions, since that will include essay. Instead use MC count + SA coconut
			// Avoid division by 0 (a concept might only have essay questions?)
			if ($shortAnswerQuestionCount + $multipleChoiceQuestionCount > 0) {
				$weightedShortAnswerScore = $shortAnswerScore * ($shortAnswerQuestionCount / ($shortAnswerQuestionCount + $multipleChoiceQuestionCount) );
				$weightedMultipleChoiceScore = $multipleChoiceScore * ($multipleChoiceQuestionCount / ($shortAnswerQuestionCount + $multipleChoiceQuestionCount) );
			} else {
				$weightedShortAnswerScore = 0;
				$weightedMultipleChoiceScore = 0;
			}

		// Finally!
			$conceptScore = $weightedShortAnswerScore + $weightedMultipleChoiceScore;

		if ($debug) {
			echo "Short answer score: $shortAnswerScore = $shortAnswerInitialScore + $shortAnswerPracticeBonus \n";
			echo "Multiple choice score: $multipleChoiceScore = $multipleChoiceInitialScore + $multipleChoicePracticeBonus \n";
			echo "Weighted SA: $weightedShortAnswerScore = $shortAnswerScore * ($shortAnswerQuestionCount / ($shortAnswerQuestionCount + $multipleChoiceQuestionCount) ) \n";
			echo "Weighted MC: $weightedMultipleChoiceScore = $multipleChoiceScore * ($multipleChoiceQuestionCount / ($shortAnswerQuestionCount + $multipleChoiceQuestionCount) ) \n";
			echo "Total concept score: $conceptScore \n";
			echo "Questions in concept $conceptId <hr><pre>";
			print_r($conceptShortAnswerQuestions);
			print_r($conceptMultipleChoiceQuestions);
		}
		// Avoid division by zero
		return $conceptScore;
	}

	// Returns the number of attempts (answered statements) a student has made for a particular question
	public static function countAttemptsForQuestion($studentId, $assessmentId, $questionNumber, $debug) {
		$statementHelper = new StatementHelper();

		// Regex for assessment id and question number (since url for object IDs will change, but end part will be the same format)
		$regex = new MongoRegex('/' . $assessmentId . '\.xml#' . $questionNumber . '$/');
		$questionDescription = "Question #{$questionNumber} of assessment {$assessmentId}";
		// Get the count of answered statements for this question for current user
		// TODO take the verb authority (adlnet/expapi/verbs/) part and put into a global constant
		$statements = $statementHelper->getStatements("openassessments",[
			'statement.actor.mbox' => 'mailto:'.$studentId,
			'statement.verb.id' => 'http://adlnet.gov/expapi/verbs/answered',
			//'statement.object.id' => $regex,
			'statement.object.definition.name.en-US' => $questionDescription,
		], [
			'statement.result.success' => true,
		]);
		if ($statements["error"]) {
			// TODO error handling
		} else {
			// My attempt at debugging slow queries to figure out how to speed them out
			//var_dump($statements["cursor"]->explain());
			return $statements["cursor"]->count();
		}
	}

	// Returns the number of correct, and better-correct attempts (Better-Correct = if there's a correct statement with no show answer statement in the minute before) a student has for a particular question
	// Returns array, e.g. {"correct" => 5, "betterCorrect" => 2}
	public static function countCorrectAttemptsForQuestion($studentId, $assessmentId, $questionNumber, $debug = false) {
		$statementHelper = new StatementHelper();

		// Regex for assessment id and question number (since url for object IDs will change, but end part will be the same format)
		$regex = new MongoRegex('/' . $assessmentId . '\.xml#' . $questionNumber . '$/');
		$questionDescription = "Question #{$questionNumber} of assessment {$assessmentId}";
		// Get the count of answered and showed-answer statements for this question for current user
		// TODO take the verb authority (adlnet/expapi/verbs/) part and put into a global constant
		$statements = $statementHelper->getStatements("openassessments",[
			'statement.actor.mbox' => 'mailto:'.$studentId,
			'statement.verb.id' => array('$in' => array(
				'http://adlnet.gov/expapi/verbs/answered',
				'http://adlnet.gov/expapi/verbs/showed-answer'
			)),
			//'statement.object.id' => $regex,
			'statement.object.definition.name.en-US' => $questionDescription,
		], [
			'statement.verb.id' => true,
			'statement.result.success' => true,
			'statement.timestamp' => true,
		]);
		if ($statements["error"]) {
			// TODO error handling
		} else {
			$correctAttempts = 0;
			$betterCorrectAttempts = 0;
			// Find the correct answered statements
			foreach ($statements["cursor"] as $statement) {
				if ($statement["statement"]["verb"]["id"] == 'http://adlnet.gov/expapi/verbs/answered' && $statement["statement"]["result"]["success"] == true) {
					if ($debug) echo "Correct answered statement!<br>";
					// Have a correct attempt
					$correctAttempts++;
					// Now see if there's a shown-answer statement in the preceding minute to check if it's a better-correct
					// Set this to false if we find a shown-answer statement in the preceding minute
					$attemptBetterCorrect = true;
					foreach ($statements["cursor"] as $possibleShowAnswerStatement) {
						if ($possibleShowAnswerStatement["statement"]["verb"]["id"] == 'http://adlnet.gov/expapi/verbs/showed-answer') {
							// Compare time 
							$timeDifference = strtotime($statement["statement"]["timestamp"]) - strtotime($possibleShowAnswerStatement["statement"]["timestamp"]);
							if ($debug) echo "Time diff (seconds): $timeDifference<br>";
							// TODO move this magic number 60
							if ($timeDifference > 0 && $timeDifference < 60) {
								$attemptBetterCorrect = false;
								break;
							}
						}
					}
					if ($attemptBetterCorrect) {
						$betterCorrectAttempts++;
					}

				}
				if ($debug) {
					echo strtotime($statement["statement"]["timestamp"]);
					echo "<pre>"; print_r($statement);
					echo "<hr>";
				}
			}
			if ($debug) echo "correct attempts: $correctAttempts, better correct attempts: $betterCorrectAttempts";
			return ["correct" => $correctAttempts, "betterCorrect" => $betterCorrectAttempts];
		}
	}

	// Calculates the percentage (0-100) of video time watched for all videos associated with a given questionID (we're using ID here, since that's what we need to search for in the mappings, and we're not dealing with statements here)
	public static function calculateVideoPercentageForQuestion($studentId, $questionId, $debug = false) {
		// Find the videos related to this question
		$relatedVideos = MappingHelper::videosForQuestion($questionId);
		$totalVideoTime = 0;
		$totalVideoTimeWatched = 0;
		$videoIds = array();

		foreach ($relatedVideos as $video) {
			// Get each video's length
			$totalVideoTime += $video["video_length"];
			// Add its ID to a list that we'll fetch watched statements for
			$videoIds []= 'https://ayamel.byu.edu/content/'.$video["video_id"];
		}

		// Calculate how much time these videos were watched
		// This is more efficient by using an $in query for all videos, rather than querying for each individual video as previously done
		$statementHelper = new StatementHelper();
		$statements = $statementHelper->getStatements("ayamel",[
			'statement.actor.mbox' => 'mailto:'.$studentId,
			'statement.verb.id' => 'https://ayamel.byu.edu/watched',
			'statement.object.id' => array('$in' => $videoIds),
		], [
			'statement.object.id' => true,
		]);
		if ($statements["error"]) {
			$watchStatementCount = 0;
			if ($debug) {
				echo "Error in fetching watched statements for question $questionId and videos: \n";
				print_r($videoIds);
			}
		} else {
			$watchStatementCount = $statements["cursor"]->count();
		}
		// TODO magic number of 10
		$totalVideoTimeWatched = $watchStatementCount * 10;

		if ($debug) {
			echo "Videos for $questionId : $watchStatementCount watched statements for the following videos: \n";
			print_r($videoIds);
		}
		// Return percentage (0-100) of videos watched, avoiding division by 0
		$percentage = ($totalVideoTime != 0) ? ($totalVideoTimeWatched / $totalVideoTime) : 0;
		return round($percentage * 100);
	}
}