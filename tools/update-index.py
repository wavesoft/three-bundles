#!/usr/bin/python
import os
import re
import json
import datetime

def walkFn(args, dirName, fileNames):
	"""
	Walk callback function to populate files 
	"""

	# Extract arguments
	(dest, match, stripPath) = args

	# Update destination
	for f in fileNames:

		# Keep only files
		fName = "%s/%s" % (dirName, f)
		if os.path.isdir(fName):
			continue

		# Skip ignored files
		if not (match is None) and not match.match(f):
			print "WARN: Ignoring %s: Unsupported extension" % fName
			continue

		# Strip optional heading path
		if fName.startswith(stripPath):
			fName = fName[len(stripPath):]

		# Append path in list
		dest.append(fName)

def walkDir(dirName, filterExt=None, includeRootPath=False):
	"""
	Walk over the specified directory and filter files
	with the specified extension
	"""

	# Prepare arguments
	dest = []
	match = None	

	# Compile filter extensions to a regex expression
	# in order to speed-up file comparison.
	if not filterExt is None:

		# Prepare regex
		reStr = ""
		for ext in filterExt:
			if reStr:
				reStr += r"|"
			reStr += r".*\.%s$" % ext

		# Compile regex
		match = re.compile( reStr )

	# If we should not include root path, strip base dir name
	if not includeRootPath:
		stripPath = dirName + "/"

	# Walk
	os.path.walk( dirName, walkFn, (dest, match, stripPath) )

	# Return
	return dest

def writeIndex(fileName, sections, compress=False):
	"""
	Write down the bundle index file 
	"""

	# Regex for extracting whatever is within the curly brackets
	# in the define() function
	RE_DEFINITION = re.compile(r"define\s*\(.*?(\{.*)\)[\n\r\s;]*$", re.DOTALL)

	# Prepare data
	data = { }

	# If we already have a previous bundle index, load it
	if os.path.isfile(fileName):
		with open(fileName, "r") as f:
			
			# Load to buffer
			buf = f.read()
			matches = RE_DEFINITION.findall(buf)

			# If we had no matches, that's an invalid index
			if not matches:
				raise RuntimeError("Could not read index.js, refusing to overwrite")

			# Try to parse
			data = json.loads(matches[0])

	# Import all sections
	for section, files in sections.iteritems():

		# Delete empty sections
		if not files:
			if section in data:
				del data[section]

		# Update the rest
		else:
			data[section] = files

	# Increment revision
	if not 'revision' in data:
		data['revision'] = 1
	else:
		data['revision'] = int(data['revision']) + 1

	# Cmopile JSON in either compressed or indented format
	if compress:
		json_buffer = json.dumps(data) 
	else:
		json_buffer = json.dumps(data, sort_keys=True, indent=4, separators=(',', ': ')) 

	# Write them down
	with open(fileName, "w") as f:
		f.write(
			'/* Bundle index file automatically generated at %s */\ndefine([],%s);\n' % (
					datetime.datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
					json_buffer
				)
			)

def enumResources(baseDir):
	"""
	Enumerate resources of known type in bundle resource locations
	"""

	# Table of supported files in the supported
	# directory locations
	supported_files = {
		'material' 	: ["json"],
		'geometry' 	: ["json"],
		'mesh'	 	: ["json", "js", "obj"],
		'object' 	: ["json"],
		'scene' 	: ["json"],
		'shader' 	: ["json", "shader"],
		'sound' 	: ["mp3", "ogg", "wav"],
		'texture' 	: ["jpg", "jpeg", "bmp", "gif", "jpg", "dds"],
		'js'		: ["js"],
	}

	# Prepare base dir
	if baseDir.endswith("/") or baseDir.endswith("\\"):
		baseDir = baseDir[:-1]

	# Enumerate and build sections
	sections = { }
	for dirName, filterExt in supported_files.iteritems():
		sections[dirName] = walkDir("%s/%s" % (baseDir, dirName), filterExt)

	# Return sections
	return sections

# Enumerate resources and build index
if __name__ == "__main__":

	# Get working dir
	workDir = os.getcwd()

	# Enumerate resources
	print "INFO: Enumerating resources"
	sections = enumResources(workDir)

	# Include bundle name
	sections['name'] = os.path.basename(workDir)

	# Write index
	print "INFO: Writing index.js"
	writeIndex("index.js", sections)
