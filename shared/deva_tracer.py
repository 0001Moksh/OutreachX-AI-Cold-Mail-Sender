import time
import asyncio
import threading
import contextvars
import functools
from typing import Dict, List, Any, Optional

# Context var to hold the current Tracer instance
current_tracer = contextvars.ContextVar("current_tracer", default=None)

class TraceSpan:
    def __init__(self, name: str, start_time: float, cpu_start: float):
        self.name = name
        self.start_time = start_time
        self.cpu_start = cpu_start
        self.end_time: Optional[float] = None
        self.cpu_end: Optional[float] = None
        self.thread_id = threading.get_ident()
        try:
            self.task_id = id(asyncio.current_task())
        except RuntimeError:
            self.task_id = None
        
        self.llm_provider = None
        self.model = None
        self.tokens_in = 0
        self.tokens_out = 0
        self.db_wait_time = 0.0
        self.pool_wait_time = 0.0
        self.http_connection_time = 0.0
        self.dns_time = 0.0
        self.tls_time = 0.0
        
        # Async Await Time Tracking
        self.await_time = 0.0
        self.event_loop_delay = 0.0

class Tracer:
    def __init__(self):
        self.spans: List[TraceSpan] = []
        self.start_time = time.perf_counter()
        self.global_stats: Dict[str, Any] = {}
        self.active_spans: Dict[str, TraceSpan] = {}
        
    def start_span(self, name: str) -> TraceSpan:
        span = TraceSpan(name, time.perf_counter(), time.process_time())
        self.spans.append(span)
        self.active_spans[name] = span
        return span
        
    def end_span(self, name: str):
        if name in self.active_spans:
            span = self.active_spans[name]
            span.end_time = time.perf_counter()
            span.cpu_end = time.process_time()
            del self.active_spans[name]

    def add_span_metric(self, name: str, key: str, value: Any):
        if name in self.active_spans:
            setattr(self.active_spans[name], key, value)
            
    def set_global_stat(self, key: str, value: Any):
        self.global_stats[key] = value
        
    def generate_report(self):
        end_time = time.perf_counter()
        total_latency = end_time - self.start_time
        
        # Get pending tasks
        try:
            loop = asyncio.get_running_loop()
            pending_tasks = len([t for t in asyncio.all_tasks(loop) if not t.done()])
        except RuntimeError:
            pending_tasks = 0
            
        print("\n" + "="*50)
        print("RUNTIME TRACE TIMELINE")
        print("="*50)
        
        # Timeline
        print(f"00.000 Request Received")
        for span in sorted(self.spans, key=lambda s: s.start_time):
            rel_start = span.start_time - self.start_time
            print(f"{rel_start:06.3f} {span.name} Started")
            
            if span.end_time:
                rel_end = span.end_time - self.start_time
                print(f"{rel_end:06.3f} {span.name} Finished")
                
                # Print metrics
                dur = span.end_time - span.start_time
                cpu = span.cpu_end - span.cpu_start
                print(f"       -> [Wall: {dur:.3f}s | CPU: {cpu:.3f}s | Thread: {span.thread_id} | Task: {span.task_id}]")
                if span.llm_provider:
                    print(f"       -> [LLM: {span.llm_provider} | Model: {span.model} | In: {span.tokens_in} | Out: {span.tokens_out}]")
                if span.dns_time > 0 or span.tls_time > 0 or span.http_connection_time > 0:
                    print(f"       -> [Net - DNS: {span.dns_time:.3f}s | TLS: {span.tls_time:.3f}s | HTTP: {span.http_connection_time:.3f}s]")
                if span.db_wait_time > 0 or span.pool_wait_time > 0:
                    print(f"       -> [DB Wait: {span.db_wait_time:.3f}s | Pool Wait: {span.pool_wait_time:.3f}s]")
                    
        print(f"{total_latency:06.3f} Request Finished")
        
        print("\n--- GLOBAL STATS ---")
        print(f"Total Request Latency: {total_latency:.3f}s")
        print(f"Active Threads: {threading.active_count()}")
        print(f"Pending Async Tasks: {pending_tasks}")
        for k, v in self.global_stats.items():
            print(f"{k}: {v}")
            
        # Analysis
        if self.spans:
            completed_spans = [s for s in self.spans if s.end_time]
            if completed_spans:
                longest_blocking = max(completed_spans, key=lambda s: s.cpu_end - s.cpu_start if (s.cpu_end is not None and s.cpu_start is not None) else 0)
                longest_wait = max(completed_spans, key=lambda s: (s.end_time - s.start_time) - (s.cpu_end - s.cpu_start) if (s.end_time is not None and s.start_time is not None and s.cpu_end is not None and s.cpu_start is not None) else 0)
                
                print("\n--- LONGEST OPERATIONS ---")
                if longest_blocking.cpu_end is not None and longest_blocking.cpu_start is not None:
                    print(f"Longest Blocking (CPU): {longest_blocking.name} ({longest_blocking.cpu_end - longest_blocking.cpu_start:.3f}s)")
                if longest_wait.end_time is not None and longest_wait.cpu_end is not None:
                    print(f"Longest Async Wait: {longest_wait.name} ({(longest_wait.end_time - longest_wait.start_time) - (longest_wait.cpu_end - longest_wait.cpu_start):.3f}s)")
                
                llm_spans = [s for s in completed_spans if s.llm_provider]
                if llm_spans:
                    longest_llm = max(llm_spans, key=lambda s: s.end_time - s.start_time)
                    print(f"Longest LLM Call: {longest_llm.name} ({longest_llm.end_time - longest_llm.start_time:.3f}s)")
                    
                net_spans = [s for s in completed_spans if s.dns_time > 0 or s.tls_time > 0 or s.http_connection_time > 0]
                if net_spans:
                    longest_net = max(net_spans, key=lambda s: s.http_connection_time + s.dns_time + s.tls_time)
                    print(f"Longest Network Call: {longest_net.name} ({longest_net.http_connection_time + longest_net.dns_time + longest_net.tls_time:.3f}s)")
                    
                db_spans = [s for s in completed_spans if s.db_wait_time > 0 or s.pool_wait_time > 0]
                if db_spans:
                    longest_db = max(db_spans, key=lambda s: s.db_wait_time + s.pool_wait_time)
                    print(f"Longest DB Wait: {longest_db.name} ({longest_db.db_wait_time + longest_db.pool_wait_time:.3f}s)")

        print("="*50 + "\n")

# Utility decorators
def trace_function(name: str):
    def decorator(func):
        if asyncio.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                tracer = current_tracer.get()
                if tracer:
                    tracer.start_span(name)
                try:
                    return await func(*args, **kwargs)
                finally:
                    if tracer:
                        tracer.end_span(name)
            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                tracer = current_tracer.get()
                if tracer:
                    tracer.start_span(name)
                try:
                    return func(*args, **kwargs)
                finally:
                    if tracer:
                        tracer.end_span(name)
            return sync_wrapper
    return decorator
