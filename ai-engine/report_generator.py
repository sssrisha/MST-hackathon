def generate_report(result):

    report = f"""
========== AI AUDIT REPORT ==========

Risk Score : {result['risk_score']}

Status : {result['status']}

Reasons:
"""

    for reason in result["reasons"]:

        report += f"\n- {reason}"

    return report 