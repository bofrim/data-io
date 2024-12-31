# Data visualization

## Overview

Early WIP. Very buggy and rough code right now.

The goal of this project is to make general data visuilization easier.
Specifically, it was inspired by my frustration for python visualization libraries. Rather than configuring all of the UI elements with python, I'd rather just build a set of JS components and pipe the data from python into these components.

I'm using MDX to make the layout of these components trivial. The MDX file contains a yaml frontmatter block that describes the data channels that the visualization components will use. The rest of the file is markdown that describes the layout of the components.

## Architecture

A redis server is used to implement data channels. A python library consumes the channel definitions and provides an interface for python to push data through the channels. The frontend will subscribe to the data channels and update the UI components as new data arrives.
