from google.adk.agents import SequentialAgent

from agents.executor_agent import executor_agent
from agents.planner_agent import planner_agent

root_agent = SequentialAgent(
    name="aria_root",
    sub_agents=[planner_agent, executor_agent],
)
