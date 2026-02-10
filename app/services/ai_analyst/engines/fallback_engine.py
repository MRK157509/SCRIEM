# app/services/ai_analyst/engines/fallback_engine.py
from __future__ import annotations

from typing import Any, Dict, List, Tuple

from ..schemas import AIAnalysisInput, AIAnalysisResult, RiskLevel


def _contains_any(text: str, needles: List[str]) -> bool:
    text = (text or "").lower()
    return any(n.lower() in text for n in needles)


def _extract_text_blob(obj: Any) -> str:
    # Flatten common fields into searchable text
    if obj is None:
        return ""
    if isinstance(obj, str):
        return obj
    if isinstance(obj, (int, float, bool)):
        return str(obj)
    if isinstance(obj, list):
        return " ".join(_extract_text_blob(x) for x in obj)
    if isinstance(obj, dict):
        parts = []
        for k, v in obj.items():
            parts.append(str(k))
            parts.append(_extract_text_blob(v))
        return " ".join(parts)
    return str(obj)


class FallbackEngine:
    """
    Deterministic, rule-based "junior analyst".
    This should never fail. It trades intelligence for reliability.
    """

    def analyze(self, payload: AIAnalysisInput) -> AIAnalysisResult:
        blob = " ".join(
            [
                _extract_text_blob(payload.alert),
                _extract_text_blob(payload.enrichment),
                _extract_text_blob(payload.iocs),
            ]
        )

        risk_level, confidence, fp_prob, mitre, actions, summary, reasoning = self._score(blob)

        return AIAnalysisResult(
            summary=summary,
            risk_level=risk_level,
            confidence=confidence,
            reasoning=reasoning,
            mitre_techniques=mitre,
            false_positive_probability=fp_prob,
            recommended_actions=actions,
            engine_used="fallback",
        )

    def _score(
        self, blob: str
    ) -> Tuple[RiskLevel, float, float, List[str], List[str], str, str]:
        blob_l = (blob or "").lower()

        mitre: List[str] = []
        actions: List[str] = []

        # baseline
        risk = RiskLevel.medium
        confidence = 0.55
        fp_prob = 0.35

        # brute force / password spraying
        if _contains_any(blob_l, ["failed login", "failed password", "invalid password", "authentication failure", "brute force", "password spraying"]):
            mitre.append("T1110")
            risk = RiskLevel.high
            confidence = 0.70
            fp_prob = 0.25
            actions += [
                "Check authentication logs for repeated failures across multiple accounts.",
                "Confirm if source IP is known/expected for the user or environment.",
                "Force password reset for impacted accounts and enable MFA if missing.",
            ]

        # suspicious powershell / scripting
        if _contains_any(blob_l, ["powershell", "encodedcommand", "base64", "cmd.exe", "wscript", "cscript", "rundll32", "regsvr32"]):
            mitre.append("T1059")
            risk = RiskLevel.high if risk in [RiskLevel.medium] else risk
            confidence = max(confidence, 0.72)
            fp_prob = min(fp_prob, 0.28)
            actions += [
                "Collect process tree and command-line arguments from EDR/host telemetry.",
                "Hunt for persistence mechanisms (scheduled tasks, registry run keys, services).",
                "Isolate host if activity is confirmed malicious.",
            ]

        # lateral movement / remote exec hints
        if _contains_any(blob_l, ["wmic", "psexec", "winrm", "remote service", "smb", "admin$", "pass-the-hash"]):
            mitre.append("T1021")
            risk = RiskLevel.critical
            confidence = max(confidence, 0.78)
            fp_prob = min(fp_prob, 0.18)
            actions += [
                "Review lateral movement indicators (SMB, WinRM, remote service creation).",
                "Check for credential theft signs and rotate privileged credentials.",
                "Contain affected endpoints and review adjacent hosts.",
            ]

        # known bad IOC hints
        if _contains_any(blob_l, ["malicious", "c2", "command and control", "tor exit", "known bad", "threat intel hit", "ioc matched"]):
            mitre.append("T1071")
            risk = RiskLevel.critical
            confidence = max(confidence, 0.82)
            fp_prob = min(fp_prob, 0.12)
            actions += [
                "Block related domains/IPs at perimeter controls and DNS security.",
                "Review outbound connections for similar patterns across hosts.",
                "Check for data exfiltration indicators and unusual outbound volumes.",
            ]

        # if nothing matched strongly, keep it useful
        if not actions:
            actions = [
                "Review alert context and validate if behavior aligns with expected user/admin activity.",
                "Check recent changes on the affected host/user (new software, policy changes, maintenance).",
                "Correlate with adjacent alerts in the same time window to confirm pattern.",
            ]

        # de-dup actions
        dedup = []
        seen = set()
        for a in actions:
            if a not in seen:
                seen.add(a)
                dedup.append(a)
        actions = dedup[:8]

        summary = self._make_summary(risk, blob_l)
        reasoning = self._make_reasoning(risk, mitre, fp_prob)

        return risk, confidence, fp_prob, mitre, actions, summary, reasoning

    def _make_summary(self, risk: RiskLevel, blob_l: str) -> str:
        if risk == RiskLevel.critical:
            return "High-confidence malicious indicators detected; likely active compromise or command-and-control behavior."
        if risk == RiskLevel.high:
            return "Suspicious activity consistent with an attack pattern; requires urgent validation and response."
        if risk == RiskLevel.medium:
            return "Potentially suspicious behavior detected; needs triage and correlation with surrounding activity."
        return "Low-severity security signal detected; verify context and baseline behavior."

    def _make_reasoning(self, risk: RiskLevel, mitre: List[str], fp_prob: float) -> str:
        mitre_s = ", ".join(mitre) if mitre else "None inferred"
        return (
            f"Fallback engine assessment based on keyword/pattern matches. "
            f"Risk={risk.value}. MITRE={mitre_s}. "
            f"Estimated false-positive probability={fp_prob:.2f} (context-dependent)."
        )
