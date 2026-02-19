"""
CSV validation logic for transaction data
"""
import pandas as pd
from typing import Tuple
from datetime import datetime


# Expected column configuration
EXPECTED_COLUMNS = [
    "transaction_id",
    "sender_id", 
    "receiver_id",
    "amount",
    "timestamp"
]

TIMESTAMP_FORMAT = "%Y-%m-%d %H:%M:%S"


class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass


def validate_csv_structure(df: pd.DataFrame) -> None:
    """
    Validate that CSV has exactly the required columns in the correct order.
    
    Args:
        df: Pandas DataFrame to validate
        
    Raises:
        ValidationError: If validation fails
    """
    actual_columns = df.columns.tolist()
    
    # Check for exact match (no extra, no missing, correct order)
    if actual_columns != EXPECTED_COLUMNS:
        if len(actual_columns) != len(EXPECTED_COLUMNS):
            if len(actual_columns) > len(EXPECTED_COLUMNS):
                extra = set(actual_columns) - set(EXPECTED_COLUMNS)
                raise ValidationError(
                    f"CSV contains extra columns: {extra}. "
                    f"Expected exactly: {EXPECTED_COLUMNS}"
                )
            else:
                missing = set(EXPECTED_COLUMNS) - set(actual_columns)
                raise ValidationError(
                    f"CSV is missing required columns: {missing}. "
                    f"Expected exactly: {EXPECTED_COLUMNS}"
                )
        else:
            # Same number of columns but different order or names
            if set(actual_columns) == set(EXPECTED_COLUMNS):
                raise ValidationError(
                    f"Columns are in wrong order. Expected order: {EXPECTED_COLUMNS}, "
                    f"but got: {actual_columns}"
                )
            else:
                raise ValidationError(
                    f"Column names don't match. Expected: {EXPECTED_COLUMNS}, "
                    f"but got: {actual_columns}"
                )


def validate_transaction_ids(df: pd.DataFrame) -> None:
    """
    Validate that all transaction IDs are unique.
    
    Args:
        df: Pandas DataFrame to validate
        
    Raises:
        ValidationError: If duplicate transaction IDs found
    """
    duplicates = df[df.duplicated(subset=['transaction_id'], keep=False)]
    if not duplicates.empty:
        duplicate_ids = duplicates['transaction_id'].unique().tolist()
        raise ValidationError(
            f"Duplicate transaction_id values found: {duplicate_ids[:5]}"
            f"{' (showing first 5)' if len(duplicate_ids) > 5 else ''}"
        )


def validate_amounts(df: pd.DataFrame) -> None:
    """
    Validate that all amounts are valid floats.
    
    Args:
        df: Pandas DataFrame to validate
        
    Raises:
        ValidationError: If invalid amounts found
    """
    try:
        # Attempt to convert to float
        amounts = pd.to_numeric(df['amount'], errors='coerce')
        
        # Check for any NaN values (failed conversions)
        invalid_mask = amounts.isna()
        if invalid_mask.any():
            invalid_rows = df[invalid_mask].index.tolist()[:5]
            raise ValidationError(
                f"Invalid amount values found at rows: {invalid_rows}"
                f"{' (showing first 5)' if invalid_mask.sum() > 5 else ''}. "
                f"Amount must be a valid number."
            )
            
        # Update the DataFrame with converted values
        df['amount'] = amounts
        
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(f"Error validating amounts: {str(e)}")


def validate_timestamps(df: pd.DataFrame) -> None:
    """
    Validate that all timestamps are in the exact format YYYY-MM-DD HH:MM:SS.
    
    Args:
        df: Pandas DataFrame to validate
        
    Raises:
        ValidationError: If invalid timestamp format found
    """
    try:
        # Convert to datetime with exact format
        timestamps = pd.to_datetime(
            df['timestamp'], 
            format=TIMESTAMP_FORMAT,
            errors='coerce'
        )
        
        # Check for any NaT values (failed conversions)
        invalid_mask = timestamps.isna()
        if invalid_mask.any():
            invalid_rows = df[invalid_mask].index.tolist()[:5]
            invalid_values = df.loc[invalid_mask, 'timestamp'].tolist()[:5]
            raise ValidationError(
                f"Invalid timestamp format at rows {invalid_rows}. "
                f"Examples: {invalid_values}. "
                f"Required format: YYYY-MM-DD HH:MM:SS"
            )
        
        # Update the DataFrame with converted datetime objects
        df['timestamp'] = timestamps
        
    except Exception as e:
        if isinstance(e, ValidationError):
            raise
        raise ValidationError(f"Error validating timestamps: {str(e)}")


def validate_csv_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Main validation function that performs all validations on the CSV data.
    
    Args:
        df: Pandas DataFrame to validate
        
    Returns:
        Validated DataFrame with proper data types
        
    Raises:
        ValidationError: If any validation fails
    """
    # Check for empty DataFrame
    if df.empty:
        raise ValidationError("CSV file is empty")
    
    # Validate structure (columns)
    validate_csv_structure(df)
    
    # Validate transaction IDs are unique
    validate_transaction_ids(df)
    
    # Validate amounts are valid floats
    validate_amounts(df)
    
    # Validate timestamps format and convert
    validate_timestamps(df)
    
    return df


def calculate_summary(df: pd.DataFrame) -> dict:
    """
    Calculate summary statistics from the validated DataFrame.
    
    Args:
        df: Validated Pandas DataFrame
        
    Returns:
        Dictionary with summary statistics
    """
    # Get unique accounts (both senders and receivers)
    unique_accounts = pd.concat([
        df['sender_id'],
        df['receiver_id']
    ]).nunique()
    
    # Get date range
    min_timestamp = df['timestamp'].min()
    max_timestamp = df['timestamp'].max()
    
    return {
        "total_transactions": len(df),
        "unique_accounts": unique_accounts,
        "date_range": {
            "start": min_timestamp.strftime(TIMESTAMP_FORMAT),
            "end": max_timestamp.strftime(TIMESTAMP_FORMAT)
        }
    }
