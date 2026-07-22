import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="Simulation de mécanique - (AMARCHICH Youssef)",
    layout="wide"
)

st.title("Simulation de mécanique -Realisee par : AMARCHICH Youssef ")

components.iframe(
    "https://mec.vercel.app",
    height=900,
    scrolling=True

)
