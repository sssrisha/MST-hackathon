import pandas as pd


def extract_features(bids):

    df = pd.DataFrame(bids)

    lowest_bid = df["amount"].min()

    highest_bid = df["amount"].max()

    average_bid = df["amount"].mean()

    price_gap = highest_bid - lowest_bid

    return {
        "lowest_bid": lowest_bid,
        "highest_bid": highest_bid,
        "average_bid": average_bid,
        "price_gap": price_gap
    }