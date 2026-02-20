"""
Quick test script to verify the FastAPI server is working correctly.
"""
import requests
import sys


def test_health_check():
    """Test the health check endpoint"""
    try:
        response = requests.get("http://localhost:8000/")
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running?")
        print("   Start the server with: uvicorn app.main:app --reload")
        return False


def test_upload_sample():
    """Test uploading the sample CSV file"""
    try:
        with open('sample_transactions.csv', 'rb') as f:
            files = {'file': ('sample_transactions.csv', f, 'text/csv')}
            response = requests.post("http://localhost:8000/upload", files=files)
        
        if response.status_code == 200:
            print("✅ Sample CSV upload successful")
            data = response.json()
            print(f"   Total transactions: {data['total_transactions']}")
            print(f"   Unique accounts: {data['unique_accounts']}")
            print(f"   Date range: {data['date_range']['start']} to {data['date_range']['end']}")
            return True
        else:
            print(f"❌ Upload failed with status {response.status_code}")
            print(f"   Error: {response.json()}")
            return False
    except FileNotFoundError:
        print("❌ sample_transactions.csv not found")
        return False
    except Exception as e:
        print(f"❌ Upload test failed: {str(e)}")
        return False


if __name__ == "__main__":
    print("\n🧪 Testing Graphora API\n")
    print("=" * 50)
    
    # Test health check
    if not test_health_check():
        sys.exit(1)
    
    print()
    
    # Test file upload
    if not test_upload_sample():
        sys.exit(1)
    
    print()
    print("=" * 50)
    print("✅ All tests passed!\n")
