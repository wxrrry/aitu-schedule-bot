from .excel_parser import parse_and_apply_excel_schedule, parse_excel_sync
from .docx_parser import parse_and_apply_docx_replacements, parse_docx_replacements_sync
from .moodle_scraper import MoodleScraper

__all__ = [
    "parse_and_apply_excel_schedule",
    "parse_excel_sync",
    "parse_and_apply_docx_replacements",
    "parse_docx_replacements_sync",
    "MoodleScraper",
]
