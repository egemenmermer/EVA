import logging
from typing import Dict, List
import pandas as pd
import numpy as np
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
from database.db_connector import DatabaseConnector

logger = logging.getLogger(__name__)

class FeedbackAnalyzer:
    """Analyze user feedback and conversation patterns."""
    
    def __init__(self, db_connector: DatabaseConnector):
        """Initialize analyzer with database connection."""
        self.db = db_connector
        
    def analyze_feedback(self, days: int = 30) -> Dict:
        """Analyze feedback patterns over the specified time period."""
        try:
            # Get feedback data from database
            with self.db.db_path.open() as conn:
                df = pd.read_sql_query('''
                SELECT f.*, c.role, c.query, c.response
                FROM feedback f
                JOIN conversations c ON f.query_id = c.id
                WHERE f.created_at >= date('now', ?)
                ''', conn, params=(f'-{days} days',))
            
            if df.empty:
                return {"error": "No feedback data available"}
            
            # Calculate metrics
            analysis = {
                'overall_stats': {
                    'total_feedback': len(df),
                    'average_rating': float(df['rating'].mean()),
                    'rating_distribution': df['rating'].value_counts().to_dict()
                },
                'by_role': df.groupby('role')['rating'].agg([
                    'count', 'mean', 'std'
                ]).to_dict('index'),
                'trend': self._calculate_rating_trend(df)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing feedback: {str(e)}")
            return {"error": str(e)}
            
    def _calculate_rating_trend(self, df: pd.DataFrame) -> Dict:
        """Calculate rating trends over time."""
        df['date'] = pd.to_datetime(df['created_at'])
        daily_ratings = df.groupby('date')['rating'].agg(['mean', 'count'])
        
        return {
            str(date): {
                'average_rating': float(row['mean']),
                'num_ratings': int(row['count'])
            }
            for date, row in daily_ratings.iterrows()
        }
        
    def generate_report(self, 
                       analysis: Dict,
                       save_dir: str,
                       include_plots: bool = True):
        """Generate a feedback analysis report."""
        save_path = Path(save_dir)
        save_path.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        try:
            # Generate plots if requested
            if include_plots:
                self._generate_plots(analysis, save_path, timestamp)
            
            # Write report
            report_path = save_path / f"feedback_report_{timestamp}.txt"
            with open(report_path, 'w') as f:
                f.write("Ethical Agent Feedback Analysis Report\n")
                f.write("=" * 40 + "\n\n")
                
                # Overall stats
                f.write("Overall Statistics:\n")
                stats = analysis['overall_stats']
                f.write(f"Total Feedback: {stats['total_feedback']}\n")
                f.write(f"Average Rating: {stats['average_rating']:.2f}\n\n")
                
                # Role-based analysis
                f.write("Analysis by Role:\n")
                for role, metrics in analysis['by_role'].items():
                    f.write(f"\n{role}:\n")
                    f.write(f"  Count: {metrics['count']}\n")
                    f.write(f"  Average Rating: {metrics['mean']:.2f}\n")
                    f.write(f"  Standard Deviation: {metrics['std']:.2f}\n")
                
            logger.info(f"Generated feedback report: {report_path}")
            
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            
    def _generate_plots(self, analysis: Dict, save_path: Path, timestamp: str):
        """Generate visualization plots."""
        try:
            # Rating distribution plot
            plt.figure(figsize=(10, 6))
            ratings = analysis['overall_stats']['rating_distribution']
            sns.barplot(x=list(ratings.keys()), y=list(ratings.values()))
            plt.title("Distribution of Feedback Ratings")
            plt.xlabel("Rating")
            plt.ylabel("Count")
            plt.savefig(save_path / f"rating_distribution_{timestamp}.png")
            plt.close()
            
            # Rating trend plot
            trend_data = analysis['trend']
            dates = list(trend_data.keys())
            ratings = [data['average_rating'] for data in trend_data.values()]
            
            plt.figure(figsize=(12, 6))
            plt.plot(dates, ratings)
            plt.title("Average Rating Trend")
            plt.xlabel("Date")
            plt.ylabel("Average Rating")
            plt.xticks(rotation=45)
            plt.tight_layout()
            plt.savefig(save_path / f"rating_trend_{timestamp}.png")
            plt.close()
            
        except Exception as e:
            logger.error(f"Error generating plots: {str(e)}") 