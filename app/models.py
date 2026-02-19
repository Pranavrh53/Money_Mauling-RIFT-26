"""
Response models for the API
"""
from pydantic import BaseModel
from typing import Dict, List, Optional


class DateRange(BaseModel):
    """Date range model for transaction summary"""
    start: str
    end: str


class UploadResponse(BaseModel):
    """Response model for successful CSV upload"""
    total_transactions: int
    unique_accounts: int
    date_range: DateRange


class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str


# Graph visualization models
class NodeData(BaseModel):
    """Node data for graph visualization"""
    id: str
    in_degree: int
    out_degree: int
    total_transactions: int
    total_amount_sent: float
    total_amount_received: float
    net_flow: float


class EdgeData(BaseModel):
    """Edge data for graph visualization"""
    source: str
    target: str
    amount: float
    transaction_count: int


class GraphSummary(BaseModel):
    """Graph summary statistics"""
    total_nodes: int
    total_edges: int
    is_connected: bool
    density: float


class GraphDataResponse(BaseModel):
    """Response model for graph data"""
    nodes: List[NodeData]
    edges: List[EdgeData]
    summary: GraphSummary


# Fraud detection models
class SuspiciousAccount(BaseModel):
    """Suspicious account details"""
    account_id: str
    score: float
    risk_level: str
    factors: List[str]
    patterns: List[str]


class FraudRing(BaseModel):
    """Fraud ring details"""
    ring_id: str
    pattern_type: str
    member_accounts: List[str]
    member_count: int
    risk_score: float
    description: str


class DetectionSummary(BaseModel):
    """Detection pipeline summary"""
    cycles_detected: int
    fanin_detected: int
    fanout_detected: int
    chains_detected: int
    total_rings: int
    high_risk_accounts: int
    medium_risk_accounts: int


class FraudDetectionResponse(BaseModel):
    """Response model for fraud detection"""
    suspicious_accounts: List[SuspiciousAccount]
    fraud_rings: List[FraudRing]
    detection_summary: DetectionSummary


# Risk Intelligence models
class RiskFactors(BaseModel):
    """Individual risk factor scores"""
    centrality: float
    velocity: float
    cycle_involvement: float
    ring_density: float
    volume_anomaly: float


class RiskIntelligenceAccount(BaseModel):
    """Enhanced account risk data"""
    account_id: str
    risk_score: float
    risk_level: str
    risk_factors: RiskFactors
    explanation: str
    patterns: List[str]


class EnhancedFraudRing(BaseModel):
    """Enhanced fraud ring with risk metrics"""
    ring_id: str
    pattern_type: str
    member_accounts: List[str]
    member_count: int
    risk_score: float
    avg_risk_score: float
    max_risk_score: float
    total_volume: float
    transaction_count: int
    description: str


class RiskRankingData(BaseModel):
    """Risk ranking response"""
    top_accounts: List[RiskIntelligenceAccount]
    top_rings: List[EnhancedFraudRing]
    statistics: Dict


class RiskIntelligenceResponse(BaseModel):
    """Response model for risk intelligence data"""
    risk_scores: List[RiskIntelligenceAccount]
    enhanced_rings: List[EnhancedFraudRing]
    rankings: RiskRankingData

