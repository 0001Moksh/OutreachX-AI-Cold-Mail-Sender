import sys
import os
# Add root path to sys.path to find 'shared'
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.database import *
