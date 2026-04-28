from app.preprocess import clean_text, spacy_preprocess
import pytest
import sys
from pathlib import Path

# Add backend app to path so we can import preprocess
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))


class TestCleanText:
    def test_basic_text(self):
        assert clean_text('Hello world') == 'Hello world'

    def test_removes_numbers(self):
        assert clean_text('Hello 123 world').strip() == 'Hello world'

    def test_removes_urls(self):
        assert clean_text(
            'Check https://example.com here').strip() == 'Check here'

    def test_removes_special_chars(self):
        assert clean_text('Hello@world#test!') == 'Helloworld test'

    def test_handles_empty_string(self):
        assert clean_text('') == ''

    def test_handles_none(self):
        assert clean_text(None) == ''

    def test_removes_multiple_spaces(self):
        text = clean_text('Hello    world')
        assert '    ' not in text


class TestSpacyPreprocess:
    def test_basic_lemmatization(self):
        result = spacy_preprocess('running quickly')
        assert 'run' in result.lower()

    def test_removes_stopwords(self):
        result = spacy_preprocess('the quick brown fox')
        assert 'the' not in result

    def test_lowercases(self):
        result = spacy_preprocess('Hello World')
        assert result.islower()

    def test_short_tokens_removed(self):
        result = spacy_preprocess('I am a test')
        assert 'i' not in result
        assert 'a' not in result

    def test_returns_string(self):
        result = spacy_preprocess('test input')
        assert isinstance(result, str)


class TestPreprocessPipeline:
    def test_full_pipeline(self):
        raw = 'Hello! I am a Software Engineer with Python, JavaScript, and SQL skills. Check https://example.com'
        cleaned = clean_text(raw)
        processed = spacy_preprocess(cleaned)
        assert isinstance(processed, str)
        assert len(processed) > 0
        assert 'python' in processed.lower() or 'software' in processed.lower()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
