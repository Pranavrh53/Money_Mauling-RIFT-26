"""
FastAPI application for financial crime detection - CSV upload and validation
"""
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from io import StringIO
import logging
import json

from app.validators import validate_csv_data, calculate_summary, ValidationError
from app.models import (UploadResponse, ErrorResponse, GraphDataResponse, FraudDetectionResponse, 
                        SuspiciousAccount, FraudRing, DetectionSummary, RiskIntelligenceResponse,
                        RiskIntelligenceAccount, EnhancedFraudRing, RiskRankingData, RiskFactors)
from app.graph_builder import TransactionGraph
from app.detection import FraudDetectionEngine
from app.risk_engine import RiskIntelligenceEngine
from app.response_builder import ResponseBuilder
from app.alert_engine import AlertEngine, AlertSeverity
from app.chatbot_engine import FraudChatBot


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Initialize FastAPI app
app = FastAPI(
    title="Financial Crime Detection API",
    description="CSV upload, validation, and graph-based transaction analysis",
    version="2.0.0"
)

# Configure CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage (in production, use Redis or database)
transaction_graph: TransactionGraph = None
transactions_df: pd.DataFrame = None
formatted_results: dict = None
risk_intelligence_data: dict = None
fraud_detection_results: dict = None
response_builder: ResponseBuilder = ResponseBuilder()

# Monitoring system components
alert_engine: AlertEngine = AlertEngine(max_alerts=100)
monitoring_mode: bool = False
detection_strategy: str = "all_patterns"  # all_patterns, cycles_only, fan_patterns, shells_only

# AI Chatbot
chatbot: FraudChatBot = FraudChatBot()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Financial Crime Detection API",
        "version": "1.0.0"
    }


@app.post(
    "/upload",
    response_model=UploadResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        413: {"model": ErrorResponse, "description": "File too large"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload and validate transaction CSV file.
    
    Accepts a CSV file with exactly 5 columns in this order:
    - transaction_id: Unique identifier for each transaction
    - sender_id: Account ID of sender
    - receiver_id: Account ID of receiver  
    - amount: Transaction amount (float)
    - timestamp: Transaction timestamp (YYYY-MM-DD HH:MM:SS)
    
    Returns summary statistics including:
    - Total number of transactions
    - Number of unique accounts
    - Date range of transactions
    """
    # Validate file type
    if not file.filename.endswith('.csv'):
        logger.warning(f"Invalid file type uploaded: {file.filename}")
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only CSV files are accepted."
        )
    
    try:
        # Read file content
        logger.info(f"Processing file: {file.filename}")
        content = await file.read()
        
        # Check file size (optional: add size limit for production)
        file_size_mb = len(content) / (1024 * 1024)
        logger.info(f"File size: {file_size_mb:.2f} MB")
        
        # For 10K rows, typical size is < 2MB. Set a reasonable limit.
        if file_size_mb > 50:
            raise HTTPException(
                status_code=413,
                detail="File too large. Maximum size is 50MB."
            )
        
        # Decode content
        try:
            content_str = content.decode('utf-8')
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400,
                detail="Invalid file encoding. File must be UTF-8 encoded."
            )
        
        # Parse CSV into DataFrame
        try:
            df = pd.read_csv(StringIO(content_str))
        except pd.errors.EmptyDataError:
            raise HTTPException(
                status_code=400,
                detail="CSV file is empty."
            )
        except pd.errors.ParserError as e:
            raise HTTPException(
                status_code=400,
                detail=f"CSV parsing error: {str(e)}"
            )
        
        logger.info(f"Parsed CSV with {len(df)} rows and {len(df.columns)} columns")
        
        # Validate CSV data
        df = validate_csv_data(df)
        logger.info("CSV validation successful")
        
        # Start timing for processing metrics
        global transaction_graph, transactions_df, response_builder
        response_builder.start_timer()
        
        # Build transaction graph
        transaction_graph = TransactionGraph()
        transaction_graph.build_from_dataframe(df)
        transactions_df = df  # Store for fraud detection
        logger.info("Transaction graph built successfully")
        
        # Calculate summary statistics
        summary = calculate_summary(df)
        logger.info(f"Summary calculated: {summary['total_transactions']} transactions, "
                   f"{summary['unique_accounts']} unique accounts")
        
        # Feed chatbot with dataset and graph context
        chatbot.set_dataset_summary(summary)
        graph_export = transaction_graph.export_for_visualization()
        chatbot.set_graph_data(
            nodes=graph_export['nodes'],
            edges=graph_export['edges'],
            summary=graph_export['summary']
        )
        chatbot.set_transactions_df(df)
        
        return UploadResponse(**summary)
        
    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    
    except Exception as e:
        logger.error(f"Unexpected error processing file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )
    
    finally:
        # Clean up
        await file.close()


@app.get(
    "/graph-data",
    response_model=GraphDataResponse,
    responses={
        404: {"model": ErrorResponse, "description": "No graph data available"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_graph_data():
    """
    Get transaction graph data for visualization.
    
    Returns graph structure with:
    - nodes: List of accounts with metrics (in_degree, out_degree, transaction counts, amounts)
    - edges: List of transaction flows between accounts
    - summary: High-level graph statistics
    
    Note: CSV file must be uploaded first via POST /upload endpoint.
    """
    global transaction_graph
    
    if transaction_graph is None:
        logger.warning("Graph data requested but no graph available")
        raise HTTPException(
            status_code=404,
            detail="No graph data available. Please upload a CSV file first."
        )
    
    try:
        logger.info("Exporting graph data for visualization")
        graph_data = transaction_graph.export_for_visualization()
        logger.info(f"Exported {len(graph_data['nodes'])} nodes and {len(graph_data['edges'])} edges")
        
        return GraphDataResponse(**graph_data)
        
    except Exception as e:
        logger.error(f"Error exporting graph data: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post(
    "/detect-fraud",
    response_model=FraudDetectionResponse,
    responses={
        404: {"model": ErrorResponse, "description": "No data available"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def detect_fraud():
    """
    Run fraud detection algorithms on uploaded transaction data.
    
    Detects:
    - Circular fund routing (cycles)
    - Smurfing patterns (fan-in/fan-out)
    - Shell networks (layered chains)
    
    Returns:
    - suspicious_accounts: Accounts with risk scores and detected patterns
    - fraud_rings: Groups of accounts involved in coordinated fraud
    - detection_summary: High-level statistics
    
    Note: CSV file must be uploaded first via POST /upload endpoint.
    """
    global transaction_graph, transactions_df, formatted_results, response_builder
    
    if transaction_graph is None or transactions_df is None:
        logger.warning("Fraud detection requested but no data available")
        raise HTTPException(
            status_code=404,
            detail="No transaction data available. Please upload a CSV file first."
        )
    
    try:
        logger.info("Starting fraud detection pipeline")
        
        # Initialize detection engine
        detector = FraudDetectionEngine(
            graph=transaction_graph.graph,
            transactions_df=transactions_df
        )
        
        # Run full detection
        results = detector.run_full_detection()
        
        # Stop timer after detection completes
        response_builder.stop_timer()
        
        # Assign ring IDs to accounts
        results = response_builder.assign_ring_ids_to_accounts(results)
        
        # Build formatted response for download
        total_accounts = len(transaction_graph.graph.nodes())
        formatted_results = response_builder.build_response(results, total_accounts)
        
        # Format response for frontend display
        suspicious_accounts = [
            SuspiciousAccount(
                account_id=acc_id,
                score=data['score'],
                risk_level=data['risk_level'],
                factors=data['factors'],
                patterns=data['patterns']
            )
            for acc_id, data in results['suspicious_accounts'].items()
            if data['score'] > 0  # Only return accounts with non-zero scores
        ]
        
        # Sort by score descending
        suspicious_accounts.sort(key=lambda x: x.score, reverse=True)
        
        fraud_rings = [
            FraudRing(**ring)
            for ring in results['fraud_rings']
        ]
        
        detection_summary = DetectionSummary(**results['detection_summary'])
        
        logger.info(f"Detection complete: {len(suspicious_accounts)} suspicious accounts, "
                   f"{len(fraud_rings)} fraud rings identified")
        
        # Store results globally for risk intelligence
        global fraud_detection_results, risk_intelligence_data
        fraud_detection_results = results
        
        # Feed chatbot with fraud detection results
        chatbot.set_fraud_results({
            'suspicious_accounts': [
                {'account_id': a.account_id, 'score': a.score,
                 'risk_level': a.risk_level, 'patterns': a.patterns, 'factors': a.factors}
                for a in suspicious_accounts
            ],
            'fraud_rings': [
                {'ring_id': r.ring_id, 'pattern_type': r.pattern_type,
                 'member_accounts': r.member_accounts, 'member_count': r.member_count,
                 'risk_score': r.risk_score, 'description': r.description}
                for r in fraud_rings
            ],
            'detection_summary': results['detection_summary']
        })
        chatbot.set_formatted_results(formatted_results)
        
        # Initialize Risk Intelligence Engine
        logger.info("Initializing Risk Intelligence Engine")
        risk_engine = RiskIntelligenceEngine(
            graph=transaction_graph.graph,
            transactions_df=transactions_df,
            fraud_rings=results['fraud_rings'],
            suspicious_accounts=results['suspicious_accounts']
        )
        
        # Calculate comprehensive risk scores
        risk_intelligence_data = risk_engine.calculate_comprehensive_risk_scores()
        logger.info(f"Risk intelligence calculated for {len(risk_intelligence_data)} accounts")
        
        # Generate alerts if monitoring mode is enabled
        if monitoring_mode:
            logger.info("Monitoring mode active - generating alerts")
            
            # Extract data for alert analysis
            risk_scores = {acc_id: data.get('risk_score', 0) 
                          for acc_id, data in risk_intelligence_data.items()}
            velocities = {acc_id: data.get('velocity_score', 0) 
                         for acc_id, data in risk_intelligence_data.items()}
            
            # Generate alerts
            new_alerts = alert_engine.analyze_and_generate_alerts(
                current_rings=results['fraud_rings'],
                risk_scores=risk_scores,
                velocities=velocities
            )
            
            logger.info(f"Generated {len(new_alerts)} new alerts")
        
        return FraudDetectionResponse(
            suspicious_accounts=suspicious_accounts,
            fraud_rings=fraud_rings,
            detection_summary=detection_summary
        )
        
    except Exception as e:
        logger.error(f"Error during fraud detection: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get(
    "/download-results",
    responses={
        404: {"model": ErrorResponse, "description": "No results available"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def download_results():
    """
    Download fraud detection results as JSON file.
    
    Returns formatted JSON in exact required specification:
    - suspicious_accounts (sorted by suspicion_score DESC)
    - fraud_rings
    - summary
    
    Note: Run fraud detection first via POST /detect-fraud endpoint.
    """
    global formatted_results
    
    if formatted_results is None:
        logger.warning("Download requested but no results available")
        raise HTTPException(
            status_code=404,
            detail="No detection results available. Please run fraud detection first."
        )
    
    try:
        logger.info("Generating JSON download")
        
        # Convert to JSON with exact formatting
        json_content = json.dumps(formatted_results, indent=2, ensure_ascii=False)
        
        # Return as downloadable file
        return Response(
            content=json_content,
            media_type="application/json",
            headers={
                "Content-Disposition": "attachment; filename=fraud_detection_results.json"
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating download: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get(
    "/risk-intelligence",
    response_model=RiskIntelligenceResponse,
    responses={
        404: {"model": ErrorResponse, "description": "No risk data available"},
        500: {"model": ErrorResponse, "description": "Internal server error"}
    }
)
async def get_risk_intelligence():
    """
    Get comprehensive risk intelligence data with advanced scoring.
    
    Returns:
    - risk_scores: Detailed risk scores for all accounts with factor breakdown
    - enhanced_rings: Fraud rings with enhanced risk metrics
    - rankings: Top risky accounts and rings
    
    Note: Run fraud detection first via POST /detect-fraud endpoint.
    """
    global risk_intelligence_data, fraud_detection_results, transaction_graph, transactions_df
    
    if risk_intelligence_data is None or fraud_detection_results is None:
        logger.warning("Risk intelligence requested but no data available")
        raise HTTPException(
            status_code=404,
            detail="No risk intelligence data available. Please run fraud detection first."
        )
    
    try:
        logger.info("Generating risk intelligence response")
        
        # Initialize risk engine (if not already done)
        risk_engine = RiskIntelligenceEngine(
            graph=transaction_graph.graph,
            transactions_df=transactions_df,
            fraud_rings=fraud_detection_results['fraud_rings'],
            suspicious_accounts=fraud_detection_results['suspicious_accounts']
        )
        
        # Use existing risk scores or calculate if needed
        if not risk_intelligence_data:
            risk_intelligence_data = risk_engine.calculate_comprehensive_risk_scores()
        else:
            risk_engine.risk_scores = risk_intelligence_data
        
        # Get top risky accounts and rings
        top_accounts = risk_engine.get_top_risky_accounts(limit=20)
        top_rings = risk_engine.get_top_risky_rings(limit=10)
        
        # Calculate statistics
        all_scores = [data['risk_score'] for data in risk_intelligence_data.values()]
        statistics = {
            'total_accounts': len(risk_intelligence_data),
            'critical_risk': sum(1 for data in risk_intelligence_data.values() if data['risk_level'] == 'CRITICAL'),
            'high_risk': sum(1 for data in risk_intelligence_data.values() if data['risk_level'] == 'HIGH'),
            'medium_risk': sum(1 for data in risk_intelligence_data.values() if data['risk_level'] == 'MEDIUM'),
            'low_risk': sum(1 for data in risk_intelligence_data.values() if data['risk_level'] == 'LOW'),
            'avg_risk_score': round(sum(all_scores) / len(all_scores), 2) if all_scores else 0,
            'max_risk_score': round(max(all_scores), 2) if all_scores else 0
        }
        
        # Format response
        risk_scores_list = [
            RiskIntelligenceAccount(
                account_id=data['account_id'],
                risk_score=data['risk_score'],
                risk_level=data['risk_level'],
                risk_factors=RiskFactors(**data['risk_factors']),
                explanation=data['explanation'],
                patterns=data['patterns']
            )
            for data in risk_intelligence_data.values()
        ]
        
        # Sort by risk score
        risk_scores_list.sort(key=lambda x: x.risk_score, reverse=True)
        
        enhanced_rings_list = [
            EnhancedFraudRing(**ring)
            for ring in top_rings
        ]
        
        rankings = RiskRankingData(
            top_accounts=[
                RiskIntelligenceAccount(
                    account_id=acc['account_id'],
                    risk_score=acc['risk_score'],
                    risk_level=acc['risk_level'],
                    risk_factors=RiskFactors(**acc['risk_factors']),
                    explanation=acc['explanation'],
                    patterns=acc['patterns']
                )
                for acc in top_accounts
            ],
            top_rings=enhanced_rings_list,
            statistics=statistics
        )
        
        logger.info(f"Risk intelligence response prepared: {len(risk_scores_list)} accounts, "
                   f"{len(enhanced_rings_list)} rings")
        
        return RiskIntelligenceResponse(
            risk_scores=risk_scores_list,
            enhanced_rings=enhanced_rings_list,
            rankings=rankings
        )
        
    except Exception as e:
        logger.error(f"Error generating risk intelligence: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/upload/incremental")
async def upload_incremental(file: UploadFile = File(...)):
    """
    Upload additional transactions incrementally without clearing existing data.
    Triggers real-time alerts for new patterns detected.
    """
    global transaction_graph, transactions_df, monitoring_mode
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")
    
    try:
        content = await file.read()
        content_str = content.decode('utf-8')
        new_df = pd.read_csv(StringIO(content_str))
        
        # Validate new transactions
        is_valid, validation_errors = validate_csv_data(new_df)
        if not is_valid:
            raise HTTPException(status_code=400, detail={"errors": validation_errors})
        
        # If no existing data, treat as initial upload
        if transactions_df is None:
            transactions_df = new_df
            transaction_graph = TransactionGraph(new_df)
            logger.info(f"Initial upload: {len(new_df)} transactions")
        else:
            # Append new transactions
            old_count = len(transactions_df)
            transactions_df = pd.concat([transactions_df, new_df], ignore_index=True)
            new_count = len(transactions_df)
            added = new_count - old_count
            
            # Update graph incrementally
            transaction_graph.add_transactions(new_df)
            logger.info(f"Incremental upload: {added} new transactions added")
        
        # Calculate summary for response
        summary = calculate_summary(transactions_df)
        summary["new_transactions"] = len(new_df)
        summary["total_transactions"] = len(transactions_df)
        
        return JSONResponse(content={
            "status": "success",
            "message": f"Added {len(new_df)} transactions incrementally",
            "summary": summary
        })
        
    except Exception as e:
        logger.error(f"Incremental upload error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/alerts")
async def get_alerts(limit: int = 50, severity: str = None):
    """
    Get recent fraud alerts.
    
    Query Parameters:
    - limit: Maximum number of alerts to return (default: 50)
    - severity: Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)
    """
    try:
        severity_filter = AlertSeverity(severity) if severity else None
        alerts = alert_engine.get_alerts(limit=limit, severity=severity_filter)
        statistics = alert_engine.get_statistics()
        
        return JSONResponse(content={
            "alerts": alerts,
            "statistics": statistics,
            "monitoring_active": monitoring_mode
        })
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid severity level")
    except Exception as e:
        logger.error(f"Error fetching alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str):
    """Mark an alert as acknowledged"""
    try:
        success = alert_engine.acknowledge_alert(alert_id)
        if success:
            return JSONResponse(content={"status": "success", "message": "Alert acknowledged"})
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except Exception as e:
        logger.error(f"Error acknowledging alert: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/alerts")
async def clear_alerts():
    """Clear all alerts"""
    try:
        alert_engine.clear_alerts()
        return JSONResponse(content={"status": "success", "message": "All alerts cleared"})
    except Exception as e:
        logger.error(f"Error clearing alerts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/monitoring/strategy")
async def set_detection_strategy(strategy: str):
    """
    Set fraud detection strategy.
    
    Options:
    - all_patterns: Detect all fraud patterns (default)
    - cycles_only: Only detect circular routing
    - fan_patterns: Only fan-in/fan-out patterns
    - shells_only: Only shell company chains
    """
    global detection_strategy
    
    valid_strategies = ["all_patterns", "cycles_only", "fan_patterns", "shells_only"]
    if strategy not in valid_strategies:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid strategy. Must be one of: {', '.join(valid_strategies)}"
        )
    
    detection_strategy = strategy
    logger.info(f"Detection strategy changed to: {strategy}")
    
    return JSONResponse(content={
        "status": "success",
        "strategy": detection_strategy,
        "message": f"Detection strategy set to {strategy}"
    })


@app.get("/monitoring/status")
async def get_monitoring_status():
    """Get current monitoring system status"""
    return JSONResponse(content={
        "monitoring_active": monitoring_mode,
        "detection_strategy": detection_strategy,
        "alert_statistics": alert_engine.get_statistics(),
        "graph_loaded": transaction_graph is not None,
        "transaction_count": len(transactions_df) if transactions_df is not None else 0
    })


@app.post("/monitoring/toggle")
async def toggle_monitoring(enabled: bool):
    """Enable or disable continuous monitoring mode"""
    global monitoring_mode
    monitoring_mode = enabled
    logger.info(f"Monitoring mode: {'enabled' if enabled else 'disabled'}")
    
    return JSONResponse(content={
        "status": "success",
        "monitoring_active": monitoring_mode
    })


@app.post("/chat")
async def chat(question: str):
    """
    AI Chatbot endpoint. Answers questions about uploaded dataset,
    fraud detection results, graph analysis, and risk intelligence.
    
    Query params:
        question: The user's question string
    
    Returns:
        JSON with answer text, category, and status flags
    """
    if not question or not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    try:
        logger.info(f"Chat query: {question}")
        result = chatbot.answer(question.strip())
        return JSONResponse(content=result)
    except Exception as e:
        logger.error(f"Chat error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom exception handler for consistent error responses"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
