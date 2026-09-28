from feature_extractor import extract_features
from co_bidding import detect_co_bidding
from winner_rotation import detect_winner_rotation


def calculate_risk(bids):

    features = extract_features(bids)

    score = 0
    reasons = []

    # Close bids
    if features["price_gap"] < 1000:

        score += 50

        reasons.append(
            "Bids are unusually close"
        )

    # Co-bidding
    suspicious_pairs = detect_co_bidding()

    if len(suspicious_pairs) > 0:

        score += 30

        reasons.append(
            "Repeated co-bidding detected"
        )

    # Winner Rotation
    if detect_winner_rotation():

        score += 20

        reasons.append(
            "Winner rotation pattern detected"
        )

    # Risk Level
    if score >= 70:

        status = "HIGH_RISK"

    elif score >= 40:

        status = "MEDIUM_RISK"

    else:

        status = "LOW_RISK"

    return {
        "risk_score": score,
        "status": status,
        "reasons": reasons
    } 