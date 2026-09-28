import networkx as nx


def detect_co_bidding():

    history = [
        ("A", "B"),
        ("A", "B"),
        ("A", "B"),
        ("A", "C"),
        ("B", "C")
    ]

    pair_count = {}

    for pair in history:

        if pair not in pair_count:
            pair_count[pair] = 0

        pair_count[pair] += 1

    suspicious_pairs = []

    for pair, count in pair_count.items():

        if count >= 3:

            suspicious_pairs.append(pair)

    return suspicious_pairs