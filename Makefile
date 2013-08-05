

run: node_modules components
	node static.js

components:
	component install

node_modules:
	npm install

.PHONY: components node_modules
