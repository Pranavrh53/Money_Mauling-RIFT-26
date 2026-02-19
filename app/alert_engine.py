"""
Alert Engine for Real-Time Fraud Monitoring
Detects and tracks critical events in the fraud detection system.
"""

from datetime import datetime
from typing import List, Dict, Optional, Tuple
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """Alert severity levels"""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AlertType(str, Enum):
    """Types of fraud alerts"""
    NEW_RING = "NEW_RING"
    RISK_SPIKE = "RISK_SPIKE"
    VELOCITY_ANOMALY = "VELOCITY_ANOMALY"
    NEW_CYCLE = "NEW_CYCLE"
    VOLUME_ANOMALY = "VOLUME_ANOMALY"
    CRITICAL_NODE = "CRITICAL_NODE"


class Alert:
    """Fraud detection alert"""
    
    def __init__(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        message: str,
        account_id: Optional[str] = None,
        ring_id: Optional[str] = None,
        risk_score: Optional[float] = None,
        metadata: Optional[Dict] = None
    ):
        self.id = f"{alert_type.value}_{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
        self.alert_type = alert_type
        self.severity = severity
        self.message = message
        self.account_id = account_id
        self.ring_id = ring_id
        self.risk_score = risk_score
        self.metadata = metadata or {}
        self.timestamp = datetime.now().isoformat()
        self.acknowledged = False
    
    def to_dict(self) -> Dict:
        """Convert alert to dictionary"""
        return {
            "id": self.id,
            "type": self.alert_type.value,
            "severity": self.severity.value,
            "message": self.message,
            "account_id": self.account_id,
            "ring_id": self.ring_id,
            "risk_score": self.risk_score,
            "metadata": self.metadata,
            "timestamp": self.timestamp,
            "acknowledged": self.acknowledged
        }


class AlertEngine:
    """
    Real-time alert detection and management system
    Monitors fraud patterns and triggers alerts for critical events
    """
    
    def __init__(self, max_alerts: int = 100):
        self.alerts: List[Alert] = []
        self.max_alerts = max_alerts
        self.previous_state = {
            "rings": set(),
            "risk_scores": {},
            "velocities": {},
            "cycles": set()
        }
        logger.info("AlertEngine initialized")
    
    def detect_new_rings(self, current_rings: List[Dict], previous_rings: set) -> List[Alert]:
        """Detect newly formed fraud rings"""
        alerts = []
        current_ring_ids = {ring.get("ring_id") for ring in current_rings}
        new_rings = current_ring_ids - previous_rings
        
        for ring in current_rings:
            ring_id = ring.get("ring_id")
            if ring_id in new_rings:
                member_count = len(ring.get("members", []))
                risk_score = ring.get("risk_score", 0)
                
                # Determine severity based on ring characteristics
                if risk_score >= 80 or member_count >= 10:
                    severity = AlertSeverity.CRITICAL
                elif risk_score >= 60 or member_count >= 7:
                    severity = AlertSeverity.HIGH
                else:
                    severity = AlertSeverity.MEDIUM
                
                alert = Alert(
                    alert_type=AlertType.NEW_RING,
                    severity=severity,
                    message=f"🚨 New fraud ring detected with {member_count} members (Risk: {risk_score:.1f})",
                    ring_id=ring_id,
                    risk_score=risk_score,
                    metadata={
                        "member_count": member_count,
                        "pattern": ring.get("pattern", "Unknown"),
                        "description": ring.get("description", "")
                    }
                )
                alerts.append(alert)
                logger.warning(f"NEW RING ALERT: {ring_id} with {member_count} members")
        
        return alerts
    
    def detect_risk_spikes(self, current_scores: Dict[str, float], previous_scores: Dict[str, float]) -> List[Alert]:
        """Detect significant risk score increases"""
        alerts = []
        spike_threshold = 20.0  # 20 point increase triggers alert
        
        for account_id, current_score in current_scores.items():
            previous_score = previous_scores.get(account_id, 0)
            spike = current_score - previous_score
            
            if spike >= spike_threshold:
                # Determine severity based on spike magnitude and final score
                if spike >= 40 or current_score >= 80:
                    severity = AlertSeverity.CRITICAL
                elif spike >= 30 or current_score >= 60:
                    severity = AlertSeverity.HIGH
                else:
                    severity = AlertSeverity.MEDIUM
                
                alert = Alert(
                    alert_type=AlertType.RISK_SPIKE,
                    severity=severity,
                    message=f"⚠️ Risk spike detected for {account_id}: {previous_score:.1f} → {current_score:.1f} (+{spike:.1f})",
                    account_id=account_id,
                    risk_score=current_score,
                    metadata={
                        "previous_score": previous_score,
                        "spike_amount": spike
                    }
                )
                alerts.append(alert)
                logger.warning(f"RISK SPIKE: {account_id} +{spike:.1f} points")
        
        return alerts
    
    def detect_velocity_anomalies(self, current_velocities: Dict[str, float], previous_velocities: Dict[str, float]) -> List[Alert]:
        """Detect sudden transaction velocity increases"""
        alerts = []
        velocity_threshold = 5.0  # 5x increase in velocity
        
        for account_id, current_velocity in current_velocities.items():
            previous_velocity = previous_velocities.get(account_id, 0)
            
            if previous_velocity > 0:
                velocity_ratio = current_velocity / previous_velocity
                
                if velocity_ratio >= velocity_threshold or current_velocity >= 10:
                    # High velocity is concerning
                    if current_velocity >= 15:
                        severity = AlertSeverity.CRITICAL
                    elif current_velocity >= 10:
                        severity = AlertSeverity.HIGH
                    else:
                        severity = AlertSeverity.MEDIUM
                    
                    alert = Alert(
                        alert_type=AlertType.VELOCITY_ANOMALY,
                        severity=severity,
                        message=f"⚡ Velocity anomaly for {account_id}: {current_velocity:.1f} txn/hour ({velocity_ratio:.1f}x increase)",
                        account_id=account_id,
                        metadata={
                            "previous_velocity": previous_velocity,
                            "current_velocity": current_velocity,
                            "ratio": velocity_ratio
                        }
                    )
                    alerts.append(alert)
                    logger.warning(f"VELOCITY ANOMALY: {account_id} {velocity_ratio:.1f}x increase")
            elif current_velocity >= 10:
                # New account with high velocity
                alert = Alert(
                    alert_type=AlertType.VELOCITY_ANOMALY,
                    severity=AlertSeverity.HIGH,
                    message=f"⚡ High velocity detected for new account {account_id}: {current_velocity:.1f} txn/hour",
                    account_id=account_id,
                    metadata={"current_velocity": current_velocity}
                )
                alerts.append(alert)
        
        return alerts
    
    def detect_critical_nodes(self, risk_scores: Dict[str, float]) -> List[Alert]:
        """Detect accounts reaching critical risk levels"""
        alerts = []
        critical_threshold = 85.0
        
        for account_id, risk_score in risk_scores.items():
            if risk_score >= critical_threshold and account_id not in self.previous_state["risk_scores"]:
                # New account at critical level
                alert = Alert(
                    alert_type=AlertType.CRITICAL_NODE,
                    severity=AlertSeverity.CRITICAL,
                    message=f"🔴 Critical risk node detected: {account_id} (Score: {risk_score:.1f})",
                    account_id=account_id,
                    risk_score=risk_score
                )
                alerts.append(alert)
                logger.critical(f"CRITICAL NODE: {account_id} score={risk_score:.1f}")
        
        return alerts
    
    def analyze_and_generate_alerts(
        self,
        current_rings: List[Dict],
        risk_scores: Dict[str, float],
        velocities: Dict[str, float]
    ) -> List[Alert]:
        """
        Analyze current state and generate all relevant alerts
        
        Args:
            current_rings: Current fraud rings
            risk_scores: Current risk scores for all accounts
            velocities: Current transaction velocities
            
        Returns:
            List of generated alerts
        """
        all_alerts = []
        
        # Detect new rings
        new_ring_alerts = self.detect_new_rings(
            current_rings,
            self.previous_state["rings"]
        )
        all_alerts.extend(new_ring_alerts)
        
        # Detect risk spikes
        risk_spike_alerts = self.detect_risk_spikes(
            risk_scores,
            self.previous_state["risk_scores"]
        )
        all_alerts.extend(risk_spike_alerts)
        
        # Detect velocity anomalies
        velocity_alerts = self.detect_velocity_anomalies(
            velocities,
            self.previous_state["velocities"]
        )
        all_alerts.extend(velocity_alerts)
        
        # Detect critical nodes
        critical_alerts = self.detect_critical_nodes(risk_scores)
        all_alerts.extend(critical_alerts)
        
        # Add new alerts to history
        for alert in all_alerts:
            self.add_alert(alert)
        
        # Update previous state
        self.previous_state["rings"] = {ring.get("ring_id") for ring in current_rings}
        self.previous_state["risk_scores"] = risk_scores.copy()
        self.previous_state["velocities"] = velocities.copy()
        
        logger.info(f"Generated {len(all_alerts)} alerts")
        return all_alerts
    
    def add_alert(self, alert: Alert):
        """Add alert to history"""
        self.alerts.insert(0, alert)  # Most recent first
        
        # Maintain max alerts limit
        if len(self.alerts) > self.max_alerts:
            self.alerts = self.alerts[:self.max_alerts]
    
    def get_alerts(self, limit: Optional[int] = None, severity: Optional[AlertSeverity] = None) -> List[Dict]:
        """Get alerts with optional filtering"""
        filtered_alerts = self.alerts
        
        if severity:
            filtered_alerts = [a for a in filtered_alerts if a.severity == severity]
        
        if limit:
            filtered_alerts = filtered_alerts[:limit]
        
        return [alert.to_dict() for alert in filtered_alerts]
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """Mark alert as acknowledged"""
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.acknowledged = True
                logger.info(f"Alert acknowledged: {alert_id}")
                return True
        return False
    
    def clear_alerts(self):
        """Clear all alerts"""
        count = len(self.alerts)
        self.alerts.clear()
        logger.info(f"Cleared {count} alerts")
    
    def get_statistics(self) -> Dict:
        """Get alert statistics"""
        total = len(self.alerts)
        by_severity = {
            "CRITICAL": sum(1 for a in self.alerts if a.severity == AlertSeverity.CRITICAL),
            "HIGH": sum(1 for a in self.alerts if a.severity == AlertSeverity.HIGH),
            "MEDIUM": sum(1 for a in self.alerts if a.severity == AlertSeverity.MEDIUM),
            "LOW": sum(1 for a in self.alerts if a.severity == AlertSeverity.LOW)
        }
        by_type = {}
        for alert in self.alerts:
            alert_type = alert.alert_type.value
            by_type[alert_type] = by_type.get(alert_type, 0) + 1
        
        acknowledged = sum(1 for a in self.alerts if a.acknowledged)
        
        return {
            "total_alerts": total,
            "by_severity": by_severity,
            "by_type": by_type,
            "acknowledged": acknowledged,
            "unacknowledged": total - acknowledged
        }
