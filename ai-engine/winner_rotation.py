def detect_winner_rotation():

    winners = [
        "A",
        "B",
        "A",
        "B",
        "A",
        "B"
    ]

    pattern_count = 0

    for i in range(len(winners)-2):

        if winners[i] == winners[i+2]:
            pattern_count += 1

    return pattern_count >= 3