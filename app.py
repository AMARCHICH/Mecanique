import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="Simulation de mécanique - (AMARCHICH Youssef)",
    layout="wide"
)

st.title("Simulation de mécanique")

components.iframe(
    "http://localhost:5173",
    height=900,
    scrolling=True
)
