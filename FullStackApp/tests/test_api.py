from app.api import app
from fastapi.testclient import TestClient
import pytest
import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))


@pytest.fixture
def client():
    return TestClient(app)


class TestPredictCategory:
    def test_predict_category_smoke(self, client):
        """Test that endpoint returns 200 and expected fields"""
        payload = {
            "resume_text": "Python developer with 5 years experience in Django and FastAPI"}
        response = client.post('/v4/predict-category', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert 'category' in data
        assert 'confidence' in data
        assert 'top5' in data
        assert isinstance(data['category'], str)
        assert 0 <= data['confidence'] <= 1

    def test_predict_category_empty(self, client):
        """Test endpoint with empty resume"""
        payload = {"resume_text": ""}
        response = client.post('/v4/predict-category', json=payload)
        assert response.status_code == 200

    def test_predict_category_long_text(self, client):
        """Test with realistic long resume"""
        long_resume = "Software Engineer\nExperience:\n" + \
            ("Python Django Flask FastAPI AWS Docker " * 20)
        payload = {"resume_text": long_resume}
        response = client.post('/v4/predict-category', json=payload)
        assert response.status_code == 200


class TestMatch:
    def test_match_smoke(self, client):
        """Test that match endpoint returns score and overlap"""
        payload = {
            "resume_text": "Python developer with AWS and Docker",
            "job_description": "Senior Python engineer with AWS, Docker, Kubernetes"
        }
        response = client.post('/v4/match', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert 'score' in data
        assert 'overlap' in data
        assert 0 <= data['score'] <= 1
        assert isinstance(data['overlap'], list)


class TestExtractSkills:
    def test_extract_skills_smoke(self, client):
        """Test that skill extraction returns list"""
        payload = {
            "resume_text": "Experienced with Python, Java, SQL, Docker, AWS"}
        response = client.post('/v4/extract-skills', json=payload)
        assert response.status_code == 200
        data = response.json()
        assert 'skills' in data
        assert isinstance(data['skills'], list)


class TestAPIIntegration:
    def test_endpoint_exists(self, client):
        """Verify all v4 endpoints exist"""
        endpoints = ['/v4/predict-category', '/v4/match', '/v4/extract-skills']
        for ep in endpoints:
            # GET should return 405 (method not allowed), but endpoint exists
            response = client.get(ep)
            assert response.status_code in [405, 422]


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
